-- Tomatina — initial schema (Phase 2 foundation)
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
--
-- Invariants honored here (CLAUDE.md):
--   #1 No precise location is EVER stored in this database. Presence and
--      coordinates live ephemerally in Redis, server-side only. At most a
--      coarse zone hash may appear in events.props.
--   #2 Identity (display_name, photo_url) exists but is unreadable by other
--      clients; reveal is mediated by the server after mutual consent.
--   #6 The game server uses the service role (bypasses RLS); clients only
--      get the narrow access defined by the policies below.

-- ============================================================ profiles
-- One row per authenticated user (phone auth). Anonymous by default.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- the anonymous public face: drives avatar rendering, no identity
  avatar_seed text not null default encode(gen_random_bytes(8), 'hex'),
  -- identity: hidden until mutual reveal (never readable by other clients)
  display_name text,
  photo_url text,
  -- trust & safety
  is_adult boolean not null default false,   -- set true by the 18+ gate
  banned_at timestamptz
);

alter table public.profiles enable row level security;

create policy "read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ============================================================ blocks
-- Block + report removes a user from the other's future matchmaking
-- (invariant 3). The matchmaker (service role) reads all rows.
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

alter table public.blocks enable row level security;

create policy "read own blocks"
  on public.blocks for select using (auth.uid() = blocker_id);
create policy "create own blocks"
  on public.blocks for insert with check (auth.uid() = blocker_id);
create policy "remove own blocks"
  on public.blocks for delete using (auth.uid() = blocker_id);

-- ============================================================ reports
-- Write-only for clients: a reporter cannot browse reports (not even
-- their own list is needed for MVP) and the reported user never sees them.
create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  room_id text,
  reason text not null,
  details text,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "file own reports"
  on public.reports for insert with check (auth.uid() = reporter_id);

-- ============================================================ events
-- Kill-gate raw events (liquidity + thesis gates). Server-only:
-- RLS is enabled with NO client policies, so only the service role writes
-- and reads. Mirrors @tomatina/shared GameEvent.
create table public.events (
  id bigint generated always as identity primary key,
  name text not null,
  ts timestamptz not null default now(),
  room_id text,
  session_ids jsonb,
  user_ids uuid[],
  props jsonb
);

alter table public.events enable row level security;

create index events_name_ts on public.events (name, ts);

-- ============================================================ helpers
-- Auto-create an empty anonymous profile at signup.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
