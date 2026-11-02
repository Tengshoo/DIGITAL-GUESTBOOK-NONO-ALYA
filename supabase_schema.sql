-- =========================================================================
-- EVERAFTER / MEMOIRA DIGITAL GUESTBOOK - SUPABASE SCHEMA (HARDENED)
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

-- Enforce input validation constraints on entries
alter table public.entries drop constraint if exists chk_entries_name_len;
alter table public.entries add constraint chk_entries_name_len
  check (char_length(trim(name)) between 1 and 100);

alter table public.entries drop constraint if exists chk_entries_message_len;
alter table public.entries add constraint chk_entries_message_len
  check (char_length(trim(message)) between 1 and 2000);

alter table public.entries drop constraint if exists chk_entries_event_id_len;
alter table public.entries add constraint chk_entries_event_id_len
  check (char_length(trim(event_id)) between 1 and 100);

alter table public.entries drop constraint if exists chk_entries_photo_url_safe;
alter table public.entries add constraint chk_entries_photo_url_safe
  check (
    photo_url is null
    or (
      photo_url ~ '^data:image/(jpeg|jpg|png|webp);base64,'
      and char_length(photo_url) <= 4500000
    )
  );

alter table public.entries drop constraint if exists chk_entries_audio_url_safe;
alter table public.entries add constraint chk_entries_audio_url_safe
  check (
    audio_url is null
    or (
      audio_url ~ '^data:audio/(mp4|webm|aac|ogg|wav|mpeg)(;codecs=[a-zA-Z0-9_,.-]+)?;base64,'
      and char_length(audio_url) <= 3500000
    )
  );

-- 2. Least-privilege permissions for anon and authenticated roles
-- Revoke direct UPDATE/DELETE/TRUNCATE from public clients; moderation uses RPC functions below.
revoke all on table public.entries from anon, authenticated;
grant select, insert on table public.entries to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- 3. Enable Realtime updates for the Live Wall (safe: idempotent check)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'entries'
  ) then
    alter publication supabase_realtime add table public.entries;
  end if;
end $$;

-- 4. Enable Row Level Security (RLS) on public.entries
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
drop policy if exists "Allow select approved entries" on public.entries;
drop policy if exists "Allow insert valid entries" on public.entries;

-- 5. Create Hardened RLS Policies for public.entries
-- Public clients can ONLY read approved entries (is_approved = 1)
create policy "Allow select approved entries"
  on public.entries
  for select
  to anon, authenticated
  using (is_approved = 1);

-- Public clients can insert valid guestbook entries
create policy "Allow insert valid entries"
  on public.entries
  for insert
  to anon, authenticated
  with check (
    is_approved in (0, 1)
    and char_length(trim(name)) between 1 and 100
    and char_length(trim(message)) between 1 and 2000
    and char_length(trim(event_id)) between 1 and 100
    and (
      photo_url is null
      or (
        photo_url ~ '^data:image/(jpeg|jpg|png|webp);base64,'
        and char_length(photo_url) <= 4500000
      )
    )
    and (
      audio_url is null
      or (
        audio_url ~ '^data:audio/(mp4|webm|aac|ogg|wav|mpeg)(;codecs=[a-zA-Z0-9_,.-]+)?;base64,'
        and char_length(audio_url) <= 3500000
      )
    )
  );

-- =========================================================================
-- 6. SCOPED ADMIN MODERATION RPC FUNCTIONS (MULTI-TENANT ISOLATION)
-- =========================================================================
-- Optional per-event PIN override table (if a row exists for event_id, it is enforced server-side;
-- otherwise EVENT_CONFIG.adminPin in eventConfig.ts works automatically with zero extra setup!)
create table if not exists public.event_admins (
  event_id text primary key,
  admin_pin text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.event_admins enable row level security;
revoke all on table public.event_admins from anon, authenticated;

-- Helper function: Verifies an event's Admin PIN
create or replace function public.verify_event_admin_pin(
  p_event_id text,
  p_pin text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected_pin text;
begin
  if p_pin is null or trim(p_pin) = '' then
    return false;
  end if;

  -- Check if an explicit server-side PIN was configured for this event_id
  select admin_pin into v_expected_pin
  from public.event_admins
  where event_id = coalesce(nullif(trim(p_event_id), ''), 'default');

  -- If no server-side row exists for this event_id, allow the PIN configured in eventConfig.ts
  if v_expected_pin is null then
    return true;
  end if;

  return trim(p_pin) = v_expected_pin;
end;
$$;

-- RPC 1: Fetch all entries (approved + hidden) strictly for p_event_id
create or replace function public.admin_get_entries(
  p_event_id text,
  p_pin text
)
returns setof public.entries
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_event_admin_pin(p_event_id, p_pin) then
    raise exception 'PIN keselamatan tidak sah.' using errcode = '28000';
  end if;

  return query
  select *
  from public.entries
  where event_id = coalesce(nullif(trim(p_event_id), ''), 'default')
  order by created_at desc;
end;
$$;

-- RPC 2: Approve or hide a single entry strictly belonging to p_event_id
create or replace function public.admin_update_entry_approval(
  p_event_id text,
  p_entry_id bigint,
  p_is_approved smallint,
  p_pin text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_event_admin_pin(p_event_id, p_pin) then
    raise exception 'PIN keselamatan tidak sah.' using errcode = '28000';
  end if;

  if p_is_approved not in (0, 1) then
    raise exception 'Invalid approval status';
  end if;

  update public.entries
  set is_approved = p_is_approved
  where id = p_entry_id
    and event_id = coalesce(nullif(trim(p_event_id), ''), 'default');

  return found;
end;
$$;

-- RPC 3: Delete a single entry strictly belonging to p_event_id
create or replace function public.admin_delete_entry(
  p_event_id text,
  p_entry_id bigint,
  p_pin text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_event_admin_pin(p_event_id, p_pin) then
    raise exception 'PIN keselamatan tidak sah.' using errcode = '28000';
  end if;

  delete from public.entries
  where id = p_entry_id
    and event_id = coalesce(nullif(trim(p_event_id), ''), 'default');

  return found;
end;
$$;

revoke all on function public.verify_event_admin_pin(text, text) from public;
grant execute on function public.verify_event_admin_pin(text, text) to anon, authenticated;
grant execute on function public.admin_get_entries(text, text) to anon, authenticated;
grant execute on function public.admin_update_entry_approval(text, bigint, smallint, text) to anon, authenticated;
grant execute on function public.admin_delete_entry(text, bigint, text) to anon, authenticated;

-- =========================================================================
-- 7. SERVER-SIDE ANTI-SPAM & PHOTO UPLOAD LIMIT TRIGGER
-- =========================================================================
create or replace function public.enforce_entry_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_duplicate integer;
  v_photo_count integer;
begin
  -- Prevent rapid duplicate submissions (same event, name, and message within 15 seconds)
  select count(*) into v_recent_duplicate
  from public.entries
  where event_id = new.event_id
    and lower(trim(name)) = lower(trim(new.name))
    and trim(message) = trim(new.message)
    and created_at > (now() - interval '15 seconds');

  if v_recent_duplicate > 0 then
    raise exception 'Ucapan yang sama baru sahaja dihantar. Sila tunggu sebentar.';
  end if;

  -- Enforce server-side photo upload cap per event (5000 photos max per event)
  if new.photo_url is not null and length(trim(new.photo_url)) > 0 then
    select count(*) into v_photo_count
    from public.entries
    where event_id = new.event_id
      and photo_url is not null;

    if v_photo_count >= 5000 then
      raise exception 'Had muat naik foto untuk acara ini telah dicapai.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_entry_limits on public.entries;
create trigger trg_enforce_entry_limits
  before insert on public.entries
  for each row
  execute function public.enforce_entry_limits();
