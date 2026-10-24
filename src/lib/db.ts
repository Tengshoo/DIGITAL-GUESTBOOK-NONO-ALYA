import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface GuestbookEntry {
  id: number;
  name: string;
  message: string;
  photo_url?: string | null;
  signature_svg?: string | null;
  audio_url?: string | null;
  is_approved: number;
  created_at: string;
}

const dbPath =
  process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'guestbook.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

declare global {
  // eslint-disable-next-line no-var
  var _guestbookDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (process.env.NODE_ENV === 'production') {
    const db = new Database(dbPath);
    initSchema(db);
    return db;
  }

  if (!globalThis._guestbookDb) {
    globalThis._guestbookDb = new Database(dbPath);
    initSchema(globalThis._guestbookDb);
  }
  return globalThis._guestbookDb;
}

function initSchema(db: Database.Database) {
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      photo_url TEXT,
      signature_svg TEXT,
      audio_url TEXT,
      is_approved INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_entries_is_approved ON entries(is_approved);
    CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at);
  `);

  // Seed sample entries if the database is newly initialized
  const count = db.prepare('SELECT COUNT(*) as total FROM entries').get() as { total: number };
  if (count.total === 0) {
    const insertSample = db.prepare(`
      INSERT INTO entries (name, message, photo_url, signature_svg, audio_url, is_approved, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);

    insertSample.run(
      'Eleanor & Thomas',
      'Wishing you both a lifetime of unending laughter, quiet shared moments, and boundless love! So honored to celebrate this unforgettable milestone with you tonight.',
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
      null,
      null,
      1,
      '-15 minutes'
    );

    insertSample.run(
      'Marcus Vance (Best Man)',
      'To the happiest couple in the room! May your journey ahead be filled with grand adventures, joyous toasts, and pure bliss. Cheers to forever!',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
      null,
      null,
      1,
      '-10 minutes'
    );

    insertSample.run(
      'Aunt Claire & Uncle David',
      'From the moment you met, anyone could see that you were destined for each other. Never stop dancing in the kitchen together.',
      'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=800&q=80',
      null,
      null,
      1,
      '-5 minutes'
    );
  }
}

export function getApprovedEntries(): GuestbookEntry[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM entries WHERE is_approved = 1 ORDER BY created_at DESC')
    .all() as GuestbookEntry[];
}

export function getAllEntries(): GuestbookEntry[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM entries ORDER BY created_at DESC')
    .all() as GuestbookEntry[];
}

export function createEntry(entry: {
  name: string;
  message: string;
  photo_url?: string | null;
  signature_svg?: string | null;
  audio_url?: string | null;
  is_approved?: number;
}): GuestbookEntry {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO entries (name, message, photo_url, signature_svg, audio_url, is_approved)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const isApproved = entry.is_approved !== undefined ? entry.is_approved : 1;
  const result = stmt.run(
    entry.name.trim(),
    entry.message.trim(),
    entry.photo_url || null,
    entry.signature_svg || null,
    entry.audio_url || null,
    isApproved
  );

  return db.prepare('SELECT * FROM entries WHERE id = ?').get(result.lastInsertRowid) as GuestbookEntry;
}

export function updateEntryStatus(id: number, is_approved: number): boolean {
  const db = getDb();
  const stmt = db.prepare('UPDATE entries SET is_approved = ? WHERE id = ?');
  const result = stmt.run(is_approved, id);
  return result.changes > 0;
}

export function deleteEntry(id: number): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM entries WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}
