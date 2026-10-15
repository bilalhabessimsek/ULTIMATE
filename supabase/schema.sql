-- ============================================================
-- ULTIMATE - Supabase şeması
-- Dashboard -> SQL -> New query -> bu dosyanın tamamını yapıştır -> Run
-- ============================================================

-- ------------------------------------------------------------
-- 1) NOTES (mevcut tablo - sadece referans, tekrar çalıştırırsa hata vermez)
-- ------------------------------------------------------------
create table if not exists public.notes (
  id text primary key,
  title text,
  content text,
  tag text,
  pinned boolean default false,
  updated_at bigint
);

-- ------------------------------------------------------------
-- 2) CALENDAR EVENTS (takvim etkinlikleri)
--    Uygulamadaki tarih formatı: 'YYYY-M-D' (sıfır dolgusuz)
-- ------------------------------------------------------------
create table if not exists public.calendar_events (
  id bigint generated always as identity primary key,
  event_date text not null,
  title text not null,
  created_at timestamptz not null default now()
);

create index if not exists calendar_events_date_idx
  on public.calendar_events (event_date);

-- ------------------------------------------------------------
-- 3) PLAYLISTS (müzik çalma listeleri)
--    track_ids: şarkıların kararlı kimlikleri (kök klasöre göre
--    küçük harfli göreli yol, ör. "rock/parca.mp3")
-- ------------------------------------------------------------
create table if not exists public.playlists (
  name text primary key,
  track_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4) MUSIC STATE (favoriler + dinleme sayıları gibi anahtar/değer veriler)
--    favorites   -> ["rock/parca.mp3", ...]
--    play_counts -> { "rock/parca.mp3": 12, ... }
-- ------------------------------------------------------------
create table if not exists public.music_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5) RLS politikaları (idempotent - ikinci kez çalıştırmak güvenli)
--    Uygulama auth kullanmadığı için anon (publishable) key ile
--    okuma/yazma açık. Kişisel kullanım içindir.
-- ------------------------------------------------------------
alter table public.notes enable row level security;
alter table public.calendar_events enable row level security;
alter table public.playlists enable row level security;
alter table public.music_state enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notes' and policyname='notes_select') then
    create policy "notes_select" on public.notes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notes' and policyname='notes_insert') then
    create policy "notes_insert" on public.notes for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notes' and policyname='notes_update') then
    create policy "notes_update" on public.notes for update using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notes' and policyname='notes_delete') then
    create policy "notes_delete" on public.notes for delete using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='calendar_events' and policyname='calendar_select') then
    create policy "calendar_select" on public.calendar_events for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='calendar_events' and policyname='calendar_insert') then
    create policy "calendar_insert" on public.calendar_events for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='calendar_events' and policyname='calendar_update') then
    create policy "calendar_update" on public.calendar_events for update using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='calendar_events' and policyname='calendar_delete') then
    create policy "calendar_delete" on public.calendar_events for delete using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='playlists' and policyname='playlists_select') then
    create policy "playlists_select" on public.playlists for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='playlists' and policyname='playlists_insert') then
    create policy "playlists_insert" on public.playlists for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='playlists' and policyname='playlists_update') then
    create policy "playlists_update" on public.playlists for update using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='playlists' and policyname='playlists_delete') then
    create policy "playlists_delete" on public.playlists for delete using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='music_state' and policyname='music_state_select') then
    create policy "music_state_select" on public.music_state for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='music_state' and policyname='music_state_insert') then
    create policy "music_state_insert" on public.music_state for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='music_state' and policyname='music_state_update') then
    create policy "music_state_update" on public.music_state for update using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='music_state' and policyname='music_state_delete') then
    create policy "music_state_delete" on public.music_state for delete using (true);
  end if;
end $$;

-- ------------------------------------------------------------
-- 6) Realtime yayını (zaten üye ise sessizce geçer)
-- ------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.notes;
exception when duplicate_object then
  null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.calendar_events;
exception when duplicate_object then
  null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.playlists;
exception when duplicate_object then
  null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.music_state;
exception when duplicate_object then
  null;
end $$;
