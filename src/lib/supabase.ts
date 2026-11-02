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

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  EVENT_CONFIG.supabase?.url ||
  '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  EVENT_CONFIG.supabase?.anonKey ||
  '';
const currentEventId = EVENT_CONFIG.supabase?.eventId || 'default';

const SAFE_PHOTO_DATA_URL_REGEX = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/;
const SAFE_AUDIO_DATA_URL_REGEX =
  /^data:audio\/(mp4|webm|aac|ogg|wav|mpeg)(;codecs=[a-zA-Z0-9_,.-]+)?;base64,[A-Za-z0-9+/=\s]+$/;

const MAX_PHOTO_DATA_URL_LENGTH = 4_500_000;
const MAX_AUDIO_DATA_URL_LENGTH = 3_500_000;
const SUBMIT_COOLDOWN_MS = 4_000;
let lastSubmissionTimestamp = 0;

export function sanitizePhotoUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (
    trimmed.length > 0 &&
    trimmed.length <= MAX_PHOTO_DATA_URL_LENGTH &&
    SAFE_PHOTO_DATA_URL_REGEX.test(trimmed)
  ) {
    return trimmed;
  }
  return null;
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
    photo_url: sanitizePhotoUrl(entry.photo_url),
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
export async function getPhotoUploadCount(): Promise<number> {
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
        return count;
      }
    } catch (err) {
      console.error('Failed to get photo upload count from Supabase:', err);
    }
  }

  const local = getLocalEntries();
  return local.filter((e) => e.photo_url && e.photo_url.trim().length > 0).length;
}

/**
 * Check if photo upload is currently permitted for this event
 */
export async function isPhotoUploadAllowed(): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
}> {
  const limit = EVENT_CONFIG.photoUploadLimit ?? 500;
  const currentCount = await getPhotoUploadCount();
  return {
    allowed: currentCount < limit,
    currentCount,
    limit,
  };
}

/**
 * Submit a new guestbook memory
 */
export async function submitGuestbookEntry(entry: {
  name: string;
  message: string;
  photo_url?: string | null;
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

  const validatedPhotoUrl = entry.photo_url ? sanitizePhotoUrl(entry.photo_url) : null;
  if (entry.photo_url && !validatedPhotoUrl) {
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

  // Enforce photo upload limit if a photo is attached
  if (validatedPhotoUrl) {
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
    try {
      const { error } = await supabase.from('entries').insert([
        {
          event_id: currentEventId,
          name: cleanName,
          message: cleanMessage,
          photo_url: validatedPhotoUrl,
          audio_url: validatedAudioUrl,
          is_approved: 1,
        },
      ]);
      if (error) {
        console.error('Supabase insert error:', error);
        return { success: false, error: error.message };
      }
      lastSubmissionTimestamp = Date.now();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: msg };
    }
  }

  // Fallback: LocalStorage when testing without Supabase credentials
  const current = getLocalEntries();
  const newEntry: SupabaseGuestEntry = {
    id: Date.now(),
    name: cleanName,
    message: cleanMessage,
    photo_url: validatedPhotoUrl,
    audio_url: validatedAudioUrl,
    is_approved: 1,
    created_at: new Date().toISOString(),
  };
  saveLocalEntries([newEntry, ...current]);
  lastSubmissionTimestamp = Date.now();
  return { success: true };
}

/**
 * Fetch all approved entries for the Live Wall
 */
export async function getApprovedEntries(): Promise<SupabaseGuestEntry[]> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      let query = supabase
        .from('entries')
        .select('*')
        .eq('is_approved', 1);

      if (currentEventId) {
        query = query.eq('event_id', currentEventId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        return getLocalEntries().filter((e) => e.is_approved === 1);
      }
      return sanitizeEntries(data || []);
    } catch (err) {
      console.error('Supabase query error:', err);
      return getLocalEntries().filter((e) => e.is_approved === 1);
    }
  }

  return getLocalEntries().filter((e) => e.is_approved === 1);
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
      return { success: true };
    }

    return { success: false, error: error.message || 'Gagal memadamkan entri.' };
  }

  const current = getLocalEntries();
  const updated = current.filter((e) => e.id !== id);
  saveLocalEntries(updated);
  return { success: true };
}
