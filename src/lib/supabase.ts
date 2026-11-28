import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EVENT_CONFIG } from '@/config/eventConfig';

export interface SupabaseGuestEntry {
  id: number;
  event_id?: string;
  name: string;
  message: string;
  photo_url?: string | null;
  signature_svg?: string | null;
  audio_url?: string | null;
  is_approved: number;
  created_at: string;
}

export const MAX_PHOTOS_PER_WISH = 10;
export const LIVE_WALL_PAGE_SIZE = 24;

let lastKnownTotalApprovedCount = 0;

export function getApprovedTotalCount(): number {
  return lastKnownTotalApprovedCount;
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  EVENT_CONFIG.supabase?.url ||
  '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  EVENT_CONFIG.supabase?.anonKey ||
  '';
const currentEventId = EVENT_CONFIG.supabase?.eventId || 'default';

const SAFE_PHOTO_HEADER_REGEX = /^data:image\/(jpeg|jpg|png|webp);base64,/i;
const SAFE_AUDIO_DATA_URL_REGEX =
  /^data:audio\/(mp4|webm|aac|ogg|wav|mpeg)(;codecs=[a-zA-Z0-9_,.-]+)?;base64,[A-Za-z0-9+/=\s]+$/;

const MAX_PHOTO_DATA_URL_LENGTH = 4_500_000;
const MAX_AUDIO_DATA_URL_LENGTH = 3_500_000;
const SUBMIT_COOLDOWN_MS = 4_000;
const PHOTO_COUNT_CACHE_TTL_MS = 15_000;
let lastSubmissionTimestamp = 0;
let cachedPhotoCount: { count: number; timestamp: number } | null = null;

// O(1) memoization cache so Live Wall & Gallery Grid never re-parse multi-megabyte JSON/Base64 strings
const parsedPhotosCache = new Map<string, string[]>();

/**
 * Fast validation of a Base64 image data URL without scanning 4MB strings with backtracking regex
 */
export function sanitizePhotoUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const len = trimmed.length;
  if (len < 32 || len > MAX_PHOTO_DATA_URL_LENGTH) return null;

  // Allow https:// demo showcase URLs if demo mode is active
  if (
    (EVENT_CONFIG as { isDemoMode?: boolean }).isDemoMode &&
    trimmed.startsWith('https://images.unsplash.com/')
  ) {
    return trimmed;
  }

  if (!SAFE_PHOTO_HEADER_REGEX.test(trimmed.slice(0, 40))) {
    return null;
  }

  // Ensure no quote/script injection characters exist
  if (trimmed.includes('"') || trimmed.includes('<') || trimmed.includes('>')) {
    return null;
  }

  return trimmed;
}

/**
 * Parses `entry.photo_url` (which may be a single data URL string or a JSON array of up to 10 data URLs)
 * into a validated array of image data URLs, with O(1) memoization.
 */
export function parsePhotoUrls(rawPhotoField?: string | null): string[] {
  if (!rawPhotoField || typeof rawPhotoField !== 'string') return [];
  const cached = parsedPhotosCache.get(rawPhotoField);
  if (cached) return cached;

  const trimmed = rawPhotoField.trim();
  if (!trimmed) return [];

  let result: string[] = [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        result = parsed
          .map((item) => (typeof item === 'string' ? sanitizePhotoUrl(item) : null))
          .filter((item): item is string => Boolean(item))
          .slice(0, MAX_PHOTOS_PER_WISH);
      }
    } catch {
      result = [];
    }
  } else {
    const single = sanitizePhotoUrl(trimmed);
    result = single ? [single] : [];
  }

  if (parsedPhotosCache.size > 400) {
    const oldestKey = parsedPhotosCache.keys().next().value;
    if (oldestKey) parsedPhotosCache.delete(oldestKey);
  }
  parsedPhotosCache.set(rawPhotoField, result);
  return result;
}

/**
 * Serializes an array of validated photo data URLs for storage in `entries.photo_url`.
 * Stores a single photo as a plain string (100% backward compatible) and 2+ photos as a JSON array.
 */
export function serializePhotoUrls(urls: string[]): string | null {
  const valid = urls
    .map((u) => sanitizePhotoUrl(u))
    .filter((u): u is string => Boolean(u))
    .slice(0, MAX_PHOTOS_PER_WISH);

  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0];
  return JSON.stringify(valid);
}

/**
 * Sanitizes an entry's `photo_url` field (preserving either a single photo or JSON array of photos)
 */
function sanitizeEntryPhotoField(rawPhotoField?: string | null): string | null {
  const photos = parsePhotoUrls(rawPhotoField);
  return serializePhotoUrls(photos);
}

export function sanitizeAudioUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (
    trimmed.length > 0 &&
    trimmed.length <= MAX_AUDIO_DATA_URL_LENGTH &&
    SAFE_AUDIO_DATA_URL_REGEX.test(trimmed)
  ) {
    return trimmed;
  }
  return null;
}

function sanitizeEntries(entries: SupabaseGuestEntry[]): SupabaseGuestEntry[] {
  return entries.map((entry) => ({
    ...entry,
    photo_url: sanitizeEntryPhotoField(entry.photo_url),
    audio_url: sanitizeAudioUrl(entry.audio_url),
  }));
}

let supabaseInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.trim().length > 0 &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim().length > 0
  );
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

// Scoped local storage key per customer event
const LOCAL_STORAGE_KEY = `everafter_guestbook_entries_${currentEventId}`;

// In-memory cache of approved entries by ID to prevent re-downloading multi-megabyte photos every 5s on Live Wall
const approvedEntriesCache = new Map<number, SupabaseGuestEntry>();

const defaultFallbackEntries: SupabaseGuestEntry[] = [
  {
    id: 1,
    name: 'Harith & Sarah',
    message:
      `Barakallahu lakuma wa baraka alaikuma wa jamaa bainakuma fi khair! Semoga mahligai yang dibina kekal hingga ke jannah. Selamat pengantin baru ${EVENT_CONFIG.title}!`,
    photo_url: null,
    signature_svg: null,
    audio_url: null,
    is_approved: 1,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 2,
    name: 'Family Pak Ngah',
    message:
      `Tahniah ${EVENT_CONFIG.title}! Sama cantik sama padan. Moga dikurniakan zuriat yang soleh dan solehah serta kebahagiaan berpanjangan.`,
    photo_url: null,
    signature_svg: null,
    audio_url: null,
    is_approved: 1,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

function getLocalEntries(): SupabaseGuestEntry[] {
  if (typeof window === 'undefined') return defaultFallbackEntries;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultFallbackEntries));
      return defaultFallbackEntries;
    }
    return sanitizeEntries(JSON.parse(raw));
  } catch {
    return defaultFallbackEntries;
  }
}

function saveLocalEntries(entries: SupabaseGuestEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

/**
 * Get total count of photo uploads for the current event
 */
export async function getPhotoUploadCount(forceRefresh = false): Promise<number> {
  if (
    !forceRefresh &&
    cachedPhotoCount &&
    Date.now() - cachedPhotoCount.timestamp < PHOTO_COUNT_CACHE_TTL_MS
  ) {
    return cachedPhotoCount.count;
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase
        .from('entries')
        .select('*', { count: 'exact', head: true })
        .not('photo_url', 'is', null);

      if (currentEventId) {
        query = query.eq('event_id', currentEventId);
      }

      const { count, error } = await query;
      if (!error && typeof count === 'number') {
        cachedPhotoCount = { count, timestamp: Date.now() };
        return count;
      }
    } catch (err) {
      console.error('Failed to get photo upload count from Supabase:', err);
    }
  }

  const local = getLocalEntries();
  const localCount = local.reduce((sum, e) => sum + parsePhotoUrls(e.photo_url).length, 0);
  cachedPhotoCount = { count: localCount, timestamp: Date.now() };
  return localCount;
}

/**
 * Check if photo upload is currently permitted for this event
 */
export async function isPhotoUploadAllowed(): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
}> {
  const limit = EVENT_CONFIG.photoUploadLimit ?? 500;
  const currentCount = await getPhotoUploadCount();
  const remaining = Math.max(0, limit - currentCount);
  return {
    allowed: currentCount < limit,
    currentCount,
    limit,
    remaining,
  };
}

/**
 * Submit a new guestbook memory (supports 1 photo via `photo_url` or up to 10 photos via `photo_urls`)
 */
export async function submitGuestbookEntry(entry: {
  name: string;
  message: string;
  photo_url?: string | null;
  photo_urls?: string[] | null;
  audio_url?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const cleanName = entry.name.trim();
  const cleanMessage = entry.message.trim();

  const now = Date.now();
  if (now - lastSubmissionTimestamp < SUBMIT_COOLDOWN_MS) {
    return {
      success: false,
      error: 'Sila tunggu sebentar sebelum menghantar ucapan seterusnya.',
    };
  }

  if (cleanName.length < 1 || cleanName.length > 100) {
    return {
      success: false,
      error: 'Nama mestilah antara 1 hingga 100 aksara.',
    };
  }

  if (cleanMessage.length < 1 || cleanMessage.length > 2000) {
    return {
      success: false,
      error: 'Ucapan mestilah antara 1 hingga 2000 aksara.',
    };
  }

  // Normalize either photo_urls array or single/serialized photo_url
  let candidatePhotos: string[] = [];
  if (Array.isArray(entry.photo_urls) && entry.photo_urls.length > 0) {
    candidatePhotos = entry.photo_urls;
  } else if (entry.photo_url) {
    candidatePhotos = parsePhotoUrls(entry.photo_url);
  }

  if (candidatePhotos.length > MAX_PHOTOS_PER_WISH) {
    return {
      success: false,
      error: `Maksimum ${MAX_PHOTOS_PER_WISH} keping gambar dibenarkan bagi setiap ucapan.`,
    };
  }

  const serializedPhotoUrl = serializePhotoUrls(candidatePhotos);
  if ((entry.photo_url || (entry.photo_urls && entry.photo_urls.length > 0)) && !serializedPhotoUrl) {
    return {
      success: false,
      error: 'Format atau saiz gambar tidak sah.',
    };
  }

  const validatedAudioUrl = entry.audio_url ? sanitizeAudioUrl(entry.audio_url) : null;
  if (entry.audio_url && !validatedAudioUrl) {
    return {
      success: false,
      error: 'Format atau saiz rakaman suara tidak sah.',
    };
  }

  // Enforce photo upload limit if photos are attached
  if (serializedPhotoUrl) {
    const { allowed, currentCount, limit } = await isPhotoUploadAllowed();
    if (!allowed) {
      return {
        success: false,
        error: `Had muat naik foto sebanyak ${limit} keping telah dicapai (${currentCount}/${limit}). Anda tetap dialu-alukan menghantar ucapan teks & nota suara!`,
      };
    }
  }

  const supabase = getSupabase();

  if (supabase) {
    const payload = {
      event_id: currentEventId,
      name: cleanName,
      message: cleanMessage,
      photo_url: serializedPhotoUrl,
      audio_url: validatedAudioUrl,
      is_approved: 1,
    };

    const MAX_ATTEMPTS = 3;
    let lastErrorMsg = 'Gagal menghantar ucapan. Sila cuba lagi.';

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        const backoffMs = attempt * 950 + Math.floor(Math.random() * 850);
        await new Promise((r) => setTimeout(r, backoffMs));
      }

      try {
        const { error } = await supabase.from('entries').insert([payload]);
        if (!error) {
          lastSubmissionTimestamp = Date.now();
          cachedPhotoCount = null;
          return { success: true };
        }

        lastErrorMsg = error.message || lastErrorMsg;
        // Do not retry deterministic constraint / anti-spam / limit errors
        const nonRetryable =
          error.code === '23514' ||
          error.code === 'P0001' ||
          /sama baru sahaja|had muat naik|check constraint/i.test(lastErrorMsg);
        if (nonRetryable) {
          return { success: false, error: lastErrorMsg };
        }
        console.warn(`Supabase insert attempt ${attempt + 1} failed:`, error);
      } catch (err: unknown) {
        lastErrorMsg = err instanceof Error ? err.message : 'Network error';
        console.warn(`Supabase insert network attempt ${attempt + 1} failed:`, lastErrorMsg);
      }
    }

    return { success: false, error: lastErrorMsg };
  }

  // Fallback: LocalStorage when testing without Supabase credentials
  const current = getLocalEntries();
  const newEntry: SupabaseGuestEntry = {
    id: Date.now(),
    name: cleanName,
    message: cleanMessage,
    photo_url: serializedPhotoUrl,
    audio_url: validatedAudioUrl,
    is_approved: 1,
    created_at: new Date().toISOString(),
  };
  saveLocalEntries([newEntry, ...current]);
  lastSubmissionTimestamp = Date.now();
  return { success: true };
}

/**
 * Fetch approved entries for the Live Wall with paginated hydration + incremental ID caching.
 * By default hydrates only the newest `limit` entries (24) so 150 concurrent viewers never
 * exhaust Supabase's 5 GB Free Tier egress even when 300+ photos have been uploaded!
 */
export async function getApprovedEntries(options?: {
  limit?: number;
}): Promise<SupabaseGuestEntry[]> {
  const limit = options?.limit ?? LIVE_WALL_PAGE_SIZE;
  const supabase = getSupabase();

  if (supabase) {
    try {
      // 1. Lightweight query: only fetch IDs and timestamps of currently approved entries (<2 KB)
      let metaQuery = supabase
        .from('entries')
        .select('id, is_approved, created_at')
        .eq('is_approved', 1);

      if (currentEventId) {
        metaQuery = metaQuery.eq('event_id', currentEventId);
      }

      const { data: metaRows, error: metaError } = await metaQuery.order('created_at', {
        ascending: false,
      });

      if (metaError || !metaRows) {
        console.error('Supabase meta fetch error:', metaError);
        const fallback = getLocalEntries().filter((e) => e.is_approved === 1);
        lastKnownTotalApprovedCount = fallback.length;
        return limit > 0 ? fallback.slice(0, limit) : fallback;
      }

      const allApprovedIds = metaRows.map((r) => r.id as number);
      lastKnownTotalApprovedCount = allApprovedIds.length;

      // Prune any cached entries that were hidden or deleted by admin
      const approvedIdSet = new Set(allApprovedIds);
      Array.from(approvedEntriesCache.keys()).forEach((cachedId) => {
        if (!approvedIdSet.has(cachedId)) {
          approvedEntriesCache.delete(cachedId);
        }
      });

      // Slice to requested pagination window (e.g. newest 24, 48, 72...)
      const targetIds = limit > 0 ? allApprovedIds.slice(0, limit) : allApprovedIds;
      const missingIds = targetIds.filter((id) => !approvedEntriesCache.has(id));

      // 2. Fetch full payload ONLY for uncached IDs within the active pagination window, in safe chunks of 12
      const CHUNK_SIZE = 12;
      for (let i = 0; i < missingIds.length; i += CHUNK_SIZE) {
        const chunkIds = missingIds.slice(i, i + CHUNK_SIZE);
        const { data: newEntries, error: fullError } = await supabase
          .from('entries')
          .select('*')
          .in('id', chunkIds);

        if (!fullError && newEntries) {
          const sanitized = sanitizeEntries(newEntries as SupabaseGuestEntry[]);
          for (const item of sanitized) {
            approvedEntriesCache.set(item.id, item);
          }
        }
      }

      // 3. Return hydrated entries in exact created_at DESC order
      return targetIds
        .map((id) => approvedEntriesCache.get(id))
        .filter((e): e is SupabaseGuestEntry => Boolean(e));
    } catch (err) {
      console.error('Supabase query error:', err);
      const fallback = getLocalEntries().filter((e) => e.is_approved === 1);
      lastKnownTotalApprovedCount = fallback.length;
      return limit > 0 ? fallback.slice(0, limit) : fallback;
    }
  }

  const localApproved = getLocalEntries().filter((e) => e.is_approved === 1);
  lastKnownTotalApprovedCount = localApproved.length;
  return limit > 0 ? localApproved.slice(0, limit) : localApproved;
}

/**
 * Verify PIN against EVENT_CONFIG.adminPin (or NEXT_PUBLIC_ADMIN_PIN)
 */
function verifyConfiguredPin(pin: string): boolean {
  const configuredPin =
    process.env.NEXT_PUBLIC_ADMIN_PIN || EVENT_CONFIG.adminPin || '1234';
  return Boolean(pin && pin.trim() === configuredPin.trim());
}

/**
 * Fetch all entries for Admin Moderation
 */
export async function getAllEntriesForAdmin(
  pin: string
): Promise<SupabaseGuestEntry[]> {
  if (!verifyConfiguredPin(pin)) {
    throw new Error('PIN keselamatan tidak sah.');
  }

  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase.rpc('admin_get_entries', {
      p_event_id: currentEventId,
      p_pin: pin.trim(),
    });

    if (!error) {
      return sanitizeEntries((data as SupabaseGuestEntry[]) || []);
    }

    // Fallback to direct scoped query if RPC hasn't been created in Supabase yet
    if (error.code === 'PGRST202') {
      let query = supabase.from('entries').select('*');
      if (currentEventId) {
        query = query.eq('event_id', currentEventId);
      }
      const fallbackRes = await query.order('created_at', { ascending: false });
      if (fallbackRes.error) {
        console.error('Supabase admin fetch error:', fallbackRes.error);
        return getLocalEntries();
      }
      return sanitizeEntries(fallbackRes.data || []);
    }

    throw new Error('PIN keselamatan tidak sah.');
  }

  return getLocalEntries();
}

/**
 * Update approval status of an entry (Scoped strictly to currentEventId)
 */
export async function updateEntryApproval(
  id: number,
  isApproved: number,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  if (!verifyConfiguredPin(pin)) {
    return { success: false, error: 'PIN keselamatan tidak sah.' };
  }

  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase.rpc('admin_update_entry_approval', {
      p_event_id: currentEventId,
      p_entry_id: id,
      p_is_approved: isApproved,
      p_pin: pin.trim(),
    });

    if (!error) {
      if (data === false) {
        return { success: false, error: 'Entri tidak ditemui untuk acara ini.' };
      }
      if (isApproved === 0) {
        approvedEntriesCache.delete(id);
      }
      return { success: true };
    }

    if (error.code === 'PGRST202') {
      const fallback = await supabase
        .from('entries')
        .update({ is_approved: isApproved })
        .eq('id', id)
        .eq('event_id', currentEventId);
      if (fallback.error) {
        return { success: false, error: fallback.error.message };
      }
      if (isApproved === 0) {
        approvedEntriesCache.delete(id);
      }
      return { success: true };
    }

    return { success: false, error: error.message || 'Gagal mengemaskini status entri.' };
  }

  const current = getLocalEntries();
  const updated = current.map((e) =>
    e.id === id ? { ...e, is_approved: isApproved } : e
  );
  saveLocalEntries(updated);
  return { success: true };
}

/**
 * Delete an entry (Scoped strictly to currentEventId)
 */
export async function deleteGuestEntry(
  id: number,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  if (!verifyConfiguredPin(pin)) {
    return { success: false, error: 'PIN keselamatan tidak sah.' };
  }

  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase.rpc('admin_delete_entry', {
      p_event_id: currentEventId,
      p_entry_id: id,
      p_pin: pin.trim(),
    });

    if (!error) {
      if (data === false) {
        return { success: false, error: 'Entri tidak ditemui untuk acara ini.' };
      }
      approvedEntriesCache.delete(id);
      return { success: true };
    }

    if (error.code === 'PGRST202') {
      const fallback = await supabase
        .from('entries')
        .delete()
        .eq('id', id)
        .eq('event_id', currentEventId);
      if (fallback.error) {
        return { success: false, error: fallback.error.message };
      }
      approvedEntriesCache.delete(id);
      return { success: true };
    }

    return { success: false, error: error.message || 'Gagal memadamkan entri.' };
  }

  const current = getLocalEntries();
  const updated = current.filter((e) => e.id !== id);
  saveLocalEntries(updated);
  return { success: true };
}
