/**
 * Google Drive Photo Storage Integration
 * 
 * Uploads guest photos and photobooth strips directly to a specified Google Drive folder
 * via a free, lightweight Google Apps Script Web App.
 */

import { EVENT_CONFIG } from '@/config/eventConfig';
import { isPhotoUploadAllowed, sanitizePhotoUrl } from '@/lib/supabase';

const GOOGLE_SCRIPT_URL =
  process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL ||
  EVENT_CONFIG.googleDrive.scriptUrl;
const GOOGLE_DRIVE_FOLDER_URL =
  process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_URL ||
  EVENT_CONFIG.googleDrive.folderUrl;

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
  // If user pasted just the Google Drive Folder ID in eventConfig.ts, build the full URL automatically
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

/**
 * Uploads a photo to Google Drive via the Google Apps Script Web App endpoint.
 */
export async function uploadPhotoToGoogleDrive({
  photoBase64,
  guestName,
  message = '',
  filename,
}: GoogleDriveUploadParams): Promise<GoogleDriveUploadResult> {
  if (!isGoogleDriveConfigured()) {
    // Graceful no-op if Google Drive webhook is not yet configured
    return { success: true };
  }

  const validatedPhoto = sanitizePhotoUrl(photoBase64);
  if (!validatedPhoto) {
    return {
      success: false,
      error: 'Format atau saiz gambar tidak sah.',
    };
  }

  // Check event photo upload limit
  const { allowed, currentCount, limit } = await isPhotoUploadAllowed();
  if (!allowed) {
    console.warn(`Photo upload limit reached (${currentCount}/${limit}). Skipping Google Drive upload.`);
    return {
      success: false,
      error: `Had muat naik foto sebanyak ${limit} keping telah dicapai (${currentCount}/${limit}).`,
    };
  }

  try {
    const cleanName =
      (guestName || 'Tetamu')
        .replace(/[^a-zA-Z0-9_\-\s]/g, '')
        .trim()
        .slice(0, 60) || 'Tetamu';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const cleanPrefix = EVENT_CONFIG.title.replace(/[^a-zA-Z0-9]/g, '') || 'Guestbook';
    const defaultFilename = `${cleanPrefix}_${cleanName}_${timestamp}.jpg`;

    const payload = {
      image: validatedPhoto,
      filename: filename || defaultFilename,
      guestName: guestName.trim().slice(0, 100),
      message: message.trim().slice(0, 2000),
      timestamp: new Date().toISOString(),
    };

    // Note: Use text/plain to avoid CORS preflight OPTIONS failure on Google Apps Script
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('Google Drive script responded with non-200 status:', response.status);
    }

    try {
      const data = await response.json();
      if (data && data.status === 'success') {
        return {
          success: true,
          fileUrl: data.fileUrl,
        };
      }
    } catch {
      // If response is opaque or CORS redirects, assume success if network request completed
      return { success: true };
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown upload error';
    console.error('Failed to upload to Google Drive:', errorMsg);
    // Don't fail the entire guest submission if Google Drive upload encounters an error
    return { success: false, error: errorMsg };
  }
}

/**
 * Sequentially uploads multiple photos (up to 10) for a single wish to Google Drive
 * so that all photos are backed up cleanly without overwhelming Google Apps Script locks.
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
    const suffix = total > 1 ? `_${i + 1}of${total}` : '';
    const filename = `${cleanPrefix}_${cleanName}${suffix}_${timestamp}.jpg`;
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
