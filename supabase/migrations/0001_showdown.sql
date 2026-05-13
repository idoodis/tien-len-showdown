-- Tien Len Showdown — invite-room schema.
-- No auth, no profiles, no economy. Anonymous players identified by client-generated IDs.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.room_status as enum ('lobby', 'dealing', 'playing', 'round_over', 'game_over');
exception when duplicate_object then null; end $$;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_player_id text,
  status public.room_status not null default 'lobby',
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index if not exists rooms_code_idx on public.rooms(code);
create index if not exists rooms_expires_idx on public.rooms(expires_at);

create table if not exists public.room_players (
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id text not null,
  display_name text not null,
  seat smallint,
  is_host boolean not null default false,
  connected boolean not null default true,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, player_id),
  unique (room_id, seat)
);
create index if not exists room_players_room_idx on public.room_players(room_id);

create table if not exists public.room_state (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  full_state jsonb,
  public_state jsonb,
  hands jsonb,
  queued jsonb default '{}'::jsonb,
  tick integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.room_events (
  id bigserial primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  player_id text,
  created_at timestamptz not null default now()
);
create index if not exists room_events_room_idx on public.room_events(room_id, created_at);

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.room_state enable row level security;
alter table public.room_events enable row level security;

drop policy if exists "rooms_read" on public.rooms;
create policy "rooms_read" on public.rooms for select using (true);
drop policy if exists "room_players_read" on public.room_players;
create policy "room_players_read" on public.room_players for select using (true);
drop policy if exists "room_events_read" on public.room_events;
create policy "room_events_read" on public.room_events for select using (true);

revoke select on public.room_state from anon, authenticated;
grant select on public.rooms, public.room_players, public.room_events to anon, authenticated;

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.room_events;
