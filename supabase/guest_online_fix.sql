-- MesaCards guest online fallback
-- Use this if Supabase Auth anonymous sign-in returns 500/AuthRetryableFetchError.
-- It enables online profiles/friends/rooms without depending on Auth.

create extension if not exists pgcrypto;

create or replace function public.generate_guest_player_code()
returns text as $$
declare
  new_code text;
begin
  loop
    new_code := 'MC-' || upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 6));
    exit when not exists (select 1 from public.guest_profiles where player_code = new_code);
  end loop;
  return new_code;
end;
$$ language plpgsql;

create table if not exists public.guest_profiles (
  device_id text primary key,
  player_code text unique not null default public.generate_guest_player_code(),
  display_name text not null default 'Jugador',
  avatar text not null default '🦊',
  level integer not null default 1,
  xp integer not null default 0,
  total_points integer not null default 0,
  games_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_display_name_len check (char_length(display_name) between 3 and 18)
);

create table if not exists public.guest_friendships (
  id uuid primary key default gen_random_uuid(),
  requester_device text not null references public.guest_profiles(device_id) on delete cascade,
  receiver_device text not null references public.guest_profiles(device_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_friendship_not_self check (requester_device <> receiver_device),
  constraint guest_friendship_unique unique (requester_device, receiver_device)
);

create table if not exists public.guest_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  host_device text not null references public.guest_profiles(device_id) on delete cascade,
  game_key text not null default 'bj',
  status text not null default 'lobby' check (status in ('lobby','playing','finished','closed')),
  max_players integer not null default 4 check (max_players between 2 and 8),
  game_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guest_room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.guest_rooms(id) on delete cascade,
  device_id text not null references public.guest_profiles(device_id) on delete cascade,
  seat_number integer,
  joined_at timestamptz not null default now(),
  constraint guest_room_player_unique unique (room_id, device_id)
);

alter table public.guest_profiles enable row level security;
alter table public.guest_friendships enable row level security;
alter table public.guest_rooms enable row level security;
alter table public.guest_room_players enable row level security;

drop policy if exists "guest profiles read" on public.guest_profiles;
drop policy if exists "guest profiles insert" on public.guest_profiles;
drop policy if exists "guest profiles update" on public.guest_profiles;
create policy "guest profiles read" on public.guest_profiles for select to anon using (true);
create policy "guest profiles insert" on public.guest_profiles for insert to anon with check (true);
create policy "guest profiles update" on public.guest_profiles for update to anon using (true) with check (true);

drop policy if exists "guest friendships read" on public.guest_friendships;
drop policy if exists "guest friendships insert" on public.guest_friendships;
drop policy if exists "guest friendships update" on public.guest_friendships;
create policy "guest friendships read" on public.guest_friendships for select to anon using (true);
create policy "guest friendships insert" on public.guest_friendships for insert to anon with check (true);
create policy "guest friendships update" on public.guest_friendships for update to anon using (true) with check (true);

drop policy if exists "guest rooms read" on public.guest_rooms;
drop policy if exists "guest rooms insert" on public.guest_rooms;
drop policy if exists "guest rooms update" on public.guest_rooms;
create policy "guest rooms read" on public.guest_rooms for select to anon using (true);
create policy "guest rooms insert" on public.guest_rooms for insert to anon with check (true);
create policy "guest rooms update" on public.guest_rooms for update to anon using (true) with check (true);

drop policy if exists "guest room players read" on public.guest_room_players;
drop policy if exists "guest room players insert" on public.guest_room_players;
drop policy if exists "guest room players update" on public.guest_room_players;
create policy "guest room players read" on public.guest_room_players for select to anon using (true);
create policy "guest room players insert" on public.guest_room_players for insert to anon with check (true);
create policy "guest room players update" on public.guest_room_players for update to anon using (true) with check (true);

create index if not exists guest_profiles_code_idx on public.guest_profiles(player_code);
create index if not exists guest_profiles_name_idx on public.guest_profiles(display_name);
create index if not exists guest_rooms_code_idx on public.guest_rooms(room_code);
create index if not exists guest_room_players_room_idx on public.guest_room_players(room_id);
