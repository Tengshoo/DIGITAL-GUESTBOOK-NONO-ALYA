-- =========================================================================
-- EVERAFTER / MEMOIRA DIGITAL GUESTBOOK - SUPABASE SCHEMA
-- =========================================================================
-- Instructions:
-- 1. Create a free project at https://supabase.com
-- 2. Go to the "SQL Editor" in the left sidebar
-- 3. Paste this entire script and click "Run"
-- =========================================================================

-- 1. Create the guestbook entries table
create table if not exists public.entries (
  id bigint primary key generated always as identity,
  event_id text not null default 'default',
  name text not null,
  message text not null,
  photo_url text,
  signature_svg text,
  audio_url text,
  is_approved smallint default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Migration for existing database tables:
alter table public.entries add column if not exists event_id text default 'default';
create index if not exists idx_entries_event_id on public.entries(event_id);

-- 2. Grant permissions to anon and authenticated roles
grant all on table public.entries to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- 3. Enable Realtime updates for the Live Wall
alter publication supabase_realtime add table public.entries;

-- 4. Enable Row Level Security (RLS)
alter table public.entries enable row level security;

-- Drop old policies if they exist
drop policy if exists "Allow reading approved entries" on public.entries;
drop policy if exists "Allow public submissions" on public.entries;
drop policy if exists "Allow updates for moderation" on public.entries;
drop policy if exists "Allow deletions for moderation" on public.entries;
drop policy if exists "Allow select entries" on public.entries;
drop policy if exists "Allow insert entries" on public.entries;
drop policy if exists "Allow update entries" on public.entries;
drop policy if exists "Allow delete entries" on public.entries;

-- 5. Create Policies
-- Allow reading entries (Home and Live Wall query only approved entries with .eq('is_approved', 1), while Admin queries all)
create policy "Allow select entries"
  on public.entries
  for select
  using (true);

-- Allow any guest to submit their wishes, photos, and voice notes
create policy "Allow insert entries"
  on public.entries
  for insert
  with check (true);

-- Allow moderation (approve/hide)
create policy "Allow update entries"
  on public.entries
  for update
  using (true)
  with check (true);

-- Allow deletion for moderation
create policy "Allow delete entries"
  on public.entries
  for delete
  using (true);

-- 5. Insert welcome sample memories for Atif & Isma
insert into public.entries (event_id, name, message, is_approved)
values
  ('atif-isma', 'Harith & Sarah', 'Barakallahu lakuma wa baraka alaikuma wa jamaa bainakuma fi khair! Semoga mahligai yang dibina kekal hingga ke jannah. Selamat pengantin baru Atif & Isma!', 1),
  ('atif-isma', 'Family Pak Ngah', 'Tahniah Atif & Isma! Sama cantik sama padan. Moga dikurniakan zuriat yang soleh dan solehah serta kebahagiaan berpanjangan.', 1);
