/**
 * Google Drive Photo Storage Integration (Hardened for High-Concurrency Event Bursts)
 *
 * Includes serialized FIFO queuing, random initial jitter, 4-attempt exponential backoff
 * to respect Google Apps Script's 30-concurrent-execution limit, and tab-close protection
 * while background uploads are in flight.
 */

import { EVENT_CONFIG } from '@/config/eventConfig';
import { isPhotoUploadAllowed, sanitizePhotoUrl } from '@/lib/supabase';

const GOOGLE_SCRIPT_URL =
  process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || EVENT_CONFIG.googleDrive.scriptUrl;

export function isGoogleDriveConfigured(): boolean {
  return typeof GOOGLE_SCRIPT_URL === 'string' && GOOGLE_SCRIPT_URL.trim().length > 0;
}

export function getGoogleDriveFolderUrl(): string {
  const raw = (
    EVENT_CONFIG.googleDrive.folderUrl ||
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_URL ||
    ''
  ).trim();
  if (!raw) {
    return 'https://drive.google.com/drive/my-drive';
  }
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  return `https://drive.google.com/drive/folders/${raw}`;
}

export interface GoogleDriveUploadParams {
  photoBase64: string;
  guestName: string;
  message?: string;
  filename?: string;
}

export interface GoogleDriveUploadResult {
  success: boolean;
  fileUrl?: string;
  error?: string;
}

// Track active queued/in-flight Drive uploads so mobile browsers warn before closing mid-backup
let pendingDriveUploads = 0;
let unloadListenerAttached = false;
const statusListeners = new Set<(pendingCount: number) => void>();

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (pendingDriveUploads > 0) {
    e.preventDefault();
    e.returnValue = '';
  }
}

function updatePendingCount(delta: number) {
  pendingDriveUploads = Math.max(0, pendingDriveUploads + delta);
  if (typeof window !== 'undefined') {
    if (pendingDriveUploads > 0 && !unloadListenerAttached) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      unloadListenerAttached = true;
    } else if (pendingDriveUploads === 0 && unloadListenerAttached) {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unloadListenerAttached = false;
    }
  }
  statusListeners.forEach((cb) => cb(pendingDriveUploads));
}

export function subscribeToDriveUploadStatus(
  callback: (pendingCount: number) => void
): () => void {
  statusListeners.add(callback);
  callback(pendingDriveUploads);
  return () => {
    statusListeners.delete(callback);
  };
}

// Serialized per-tab FIFO queue so rapid multi-photo & photobooth uploads never collide
let uploadQueueChain: Promise<unknown> = Promise.resolve();

function enqueueUploadTask<T>(task: () => Promise<T>): Promise<T> {
  const next = uploadQueueChain.then(task, task);
  uploadQueueChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

function detectExtensionFromDataUrl(dataUrl: string): 'webp' | 'png' | 'jpg' {
  if (dataUrl.startsWith('data:image/webp')) return 'webp';
  if (dataUrl.startsWith('data:image/png')) return 'png';
  return 'jpg';
}

/**
 * Uploads a single photo to Google Drive via Google Apps Script with 4-attempt exponential
 * backoff + random jitter so 150+ simultaneous guests smoothly drain through Google's 30-concurrency cap.
 */
export async function uploadPhotoToGoogleDrive({
  photoBase64,
  guestName,
  message = '',
  filename,
}: GoogleDriveUploadParams): Promise<GoogleDriveUploadResult> {
  if (!isGoogleDriveConfigured()) {
    return { success: true };
  }

  const validatedPhoto = sanitizePhotoUrl(photoBase64);
  if (!validatedPhoto) {
    return {
      success: false,
      error: 'Format atau saiz gambar tidak sah.',
    };
  }

  const { allowed, currentCount, limit } = await isPhotoUploadAllowed();
  if (!allowed) {
    return {
      success: false,
      error: `Had muat naik foto sebanyak ${limit} keping telah dicapai (${currentCount}/${limit}).`,
    };
  }

  updatePendingCount(1);

  return enqueueUploadTask(async () => {
    try {
      // Initial random micro-stagger (120-850ms) to desynchronize simultaneous guest taps at an event
      await new Promise((r) => setTimeout(r, 120 + Math.floor(Math.random() * 730)));

      const ext = detectExtensionFromDataUrl(validatedPhoto);
      const cleanName =
        (guestName || 'Tetamu')
          .replace(/[^a-zA-Z0-9_\-\s]/g, '')
          .trim()
          .slice(0, 60) || 'Tetamu';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const cleanPrefix = EVENT_CONFIG.title.replace(/[^a-zA-Z0-9]/g, '') || 'Guestbook';

      const resolvedFilename = filename
        ? filename.replace(/\.(jpe?g|png|webp)$/i, `.${ext}`)
        : `${cleanPrefix}_${cleanName}_${timestamp}.${ext}`;

      const payloadBody = JSON.stringify({
        image: validatedPhoto,
        filename: resolvedFilename,
        guestName: guestName.trim().slice(0, 100),
        message: message.trim().slice(0, 2000),
        timestamp: new Date().toISOString(),
      });

      const MAX_ATTEMPTS = 4;
      let lastErr = 'Unknown upload error';

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (attempt > 0) {
          // Exponential backoff with full jitter: ~1.5-3.5s -> ~3.5-7.5s -> ~7.5-14s
          const baseDelay = Math.pow(2, attempt) * 1000;
          const jitter = Math.floor(Math.random() * 2200);
          await new Promise((r) => setTimeout(r, baseDelay + jitter));
        }

        try {
          const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            },
            body: payloadBody,
          });

          // Retry on Google Apps Script rate-limit / concurrency 429 or 5xx responses
          if (response.status === 429 || response.status >= 500) {
            lastErr = `HTTP ${response.status}`;
            continue;
          }

          const text = await response.text();
          // Google Apps Script sometimes returns an HTML error page on 30-concurrency spike with status 200
          if (
            text.includes('Too Many') ||
            text.includes('Service invoked too many times') ||
            text.includes('<!DOCTYPE html>')
          ) {
            lastErr = 'Apps Script busy (retrying)';
            continue;
          }

          try {
            const data = JSON.parse(text);
            if (data && data.status === 'success') {
              return { success: true, fileUrl: data.fileUrl };
            }
            if (data && data.status === 'error') {
              lastErr = data.message || 'Apps Script error';
              // Don't retry permanent validation failures
              if (/invalid|exceeds|not found/i.test(lastErr)) {
                return { success: false, error: lastErr };
              }
              continue;
            }
          } catch {
            // Opaque / redirect completion
            if (response.ok) {
              return { success: true };
            }
          }

          if (response.ok) {
            return { success: true };
          }
        } catch (netErr: unknown) {
          lastErr = netErr instanceof Error ? netErr.message : 'Network error';
        }
      }

      console.warn('Google Drive backup exhausted retries:', lastErr);
      return { success: false, error: lastErr };
    } finally {
      updatePendingCount(-1);
    }
  });
}

/**
 * Queues multiple photos (up to 10) for sequential, backoff-protected Google Drive backup.
 */
export async function uploadPhotosToGoogleDrive({
  photosBase64,
  guestName,
  message = '',
}: {
  photosBase64: string[];
  guestName: string;
  message?: string;
}): Promise<{ success: boolean; uploadedCount: number }> {
  if (!isGoogleDriveConfigured() || !photosBase64 || photosBase64.length === 0) {
    return { success: true, uploadedCount: 0 };
  }

  const cleanName =
    (guestName || 'Tetamu')
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .trim()
      .slice(0, 60) || 'Tetamu';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const cleanPrefix = EVENT_CONFIG.title.replace(/[^a-zA-Z0-9]/g, '') || 'Guestbook';

  let uploadedCount = 0;
  const total = photosBase64.length;

  for (let i = 0; i < total; i++) {
    const ext = detectExtensionFromDataUrl(photosBase64[i]);
    const suffix = total > 1 ? `_${i + 1}of${total}` : '';
    const filename = `${cleanPrefix}_${cleanName}${suffix}_${timestamp}.${ext}`;
    const res = await uploadPhotoToGoogleDrive({
      photoBase64: photosBase64[i],
      guestName,
      message,
      filename,
    });
    if (res.success) {
      uploadedCount++;
    }
  }

  return { success: uploadedCount > 0, uploadedCount };
}
