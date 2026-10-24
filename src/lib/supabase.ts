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
      'Barakallahu lakuma wa baraka alaikuma wa jamaa bainakuma fi khair! Semoga mahligai yang dibina kekal hingga ke jannah. Selamat pengantin baru Atif & Isma!',
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
      'Tahniah Atif & Isma! Sama cantik sama padan. Moga dikurniakan zuriat yang soleh dan solehah serta kebahagiaan berpanjangan.',
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
    return JSON.parse(raw);
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
  // Enforce photo upload limit if a photo is attached
  if (entry.photo_url && entry.photo_url.trim().length > 0) {
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
          name: entry.name.trim(),
          message: entry.message.trim(),
          photo_url: entry.photo_url || null,
          audio_url: entry.audio_url || null,
          is_approved: 1, // Automatically approved or set to 0 if manual moderation is preferred
        },
      ]);
      if (error) {
        console.error('Supabase insert error:', error);
        return { success: false, error: error.message };
      }
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
    name: entry.name.trim(),
    message: entry.message.trim(),
    photo_url: entry.photo_url || null,
    audio_url: entry.audio_url || null,
    is_approved: 1,
    created_at: new Date().toISOString(),
  };
  saveLocalEntries([newEntry, ...current]);
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
      return data || [];
    } catch (err) {
      console.error('Supabase query error:', err);
      return getLocalEntries().filter((e) => e.is_approved === 1);
    }
  }

  return getLocalEntries().filter((e) => e.is_approved === 1);
}

/**
 * Fetch all entries for Admin Moderation
 */
export async function getAllEntriesForAdmin(): Promise<SupabaseGuestEntry[]> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      let query = supabase.from('entries').select('*');

      if (currentEventId) {
        query = query.eq('event_id', currentEventId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase admin fetch error:', error);
        return getLocalEntries();
      }
      return data || [];
    } catch (err) {
      console.error('Supabase query error:', err);
      return getLocalEntries();
    }
  }

  return getLocalEntries();
}

/**
 * Update approval status of an entry
 */
export async function updateEntryApproval(
  id: number,
  isApproved: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  if (supabase) {
    const { error } = await supabase
      .from('entries')
      .update({ is_approved: isApproved })
      .eq('id', id);
    if (error) {
      console.error('Supabase update error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  const current = getLocalEntries();
  const updated = current.map((e) =>
    e.id === id ? { ...e, is_approved: isApproved } : e
  );
  saveLocalEntries(updated);
  return { success: true };
}

/**
 * Delete an entry
 */
export async function deleteGuestEntry(
  id: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  if (supabase) {
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  const current = getLocalEntries();
  const updated = current.filter((e) => e.id !== id);
  saveLocalEntries(updated);
  return { success: true };
}
