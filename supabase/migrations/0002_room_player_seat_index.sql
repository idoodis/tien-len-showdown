-- Preserve multiple standing players while still preventing two players from
-- occupying the same seat in one room.

alter table public.room_players
  add column if not exists updated_at timestamptz not null default now();

alter table public.room_players
  drop constraint if exists room_players_room_id_seat_key;

create unique index if not exists room_players_unique_seat
  on public.room_players(room_id, seat)
  where seat is not null;
