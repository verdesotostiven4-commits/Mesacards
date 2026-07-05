-- MesaCards online/social schema for Supabase
-- Run this in Supabase SQL Editor after creating the project.

create extension if not exists pgcrypto;

create type friendship_status as enum ('pending', 'accepted', 'blocked');
create type room_status as enum ('waiting', 'playing', 'finished', 'cancelled');
create type player_result as enum ('win', 'loss', 'draw', 'left');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  player_code text unique not null,
  display_name text unique not null,
  avatar text not null default '🦊',
  color text not null default 'gold',
  frame text not null default 'classic',
  level integer not null default 1,
  xp integer not null default 0,
  total_points integer not null default 0,
  games_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  last_played_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint display_name_length check (char_length(display_name) between 3 and 18),
  constraint player_code_format check (player_code ~ '^MC-[A-Z0-9]{6}$')
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(requester_id, receiver_id),
  constraint no_self_friend check (requester_id <> receiver_id)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  host_id uuid not null references public.profiles(id) on delete cascade,
  game_key text not null,
  status room_status not null default 'waiting',
  max_players integer not null default 4,
  is_private boolean not null default true,
  game_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_code_format check (room_code ~ '^[A-Z0-9]{4,6}$'),
  constraint max_players_range check (max_players between 2 and 8)
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  seat_number integer not null,
  is_host boolean not null default false,
  is_ready boolean not null default false,
  private_state jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default now(),
  unique(room_id, profile_id),
  unique(room_id, seat_number),
  constraint seat_range check (seat_number between 1 and 8)
);

create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_key text not null,
  result player_result not null,
  points_delta integer not null default 0,
  xp_delta integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.share_invites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('profile', 'room')),
  target_id uuid,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.generate_player_code()
returns text as $$
declare
  code text;
begin
  loop
    code := 'MC-' || upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 6));
    exit when not exists (select 1 from public.profiles where player_code = code);
  end loop;
  return code;
end;
$$ language plpgsql security definer;

create or replace function public.generate_room_code()
returns text as $$
declare
  code text;
begin
  loop
    code := upper(substring(encode(gen_random_bytes(3), 'hex') from 1 for 5));
    exit when not exists (select 1 from public.rooms where room_code = code);
  end loop;
  return code;
end;
$$ language plpgsql security definer;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, player_code, display_name)
  values (
    new.id,
    public.generate_player_code(),
    'Jugador' || substring(new.id::text from 1 for 6)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.game_results enable row level security;
alter table public.share_invites enable row level security;

create policy "profiles are visible to authenticated users" on public.profiles
  for select to authenticated using (true);
create policy "users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "friendships visible to participants" on public.friendships
  for select to authenticated using (auth.uid() = requester_id or auth.uid() = receiver_id);
create policy "users create friend requests" on public.friendships
  for insert to authenticated with check (auth.uid() = requester_id);
create policy "receiver can respond" on public.friendships
  for update to authenticated using (auth.uid() = receiver_id or auth.uid() = requester_id);

create policy "rooms visible to participants or waiting private code" on public.rooms
  for select to authenticated using (true);
create policy "users create rooms" on public.rooms
  for insert to authenticated with check (auth.uid() = host_id);
create policy "host updates room" on public.rooms
  for update to authenticated using (auth.uid() = host_id);

create policy "room players visible" on public.room_players
  for select to authenticated using (true);
create policy "join room as self" on public.room_players
  for insert to authenticated with check (auth.uid() = profile_id);
create policy "update own room player" on public.room_players
  for update to authenticated using (auth.uid() = profile_id);

create policy "results visible" on public.game_results
  for select to authenticated using (true);
create policy "insert own result" on public.game_results
  for insert to authenticated with check (auth.uid() = profile_id);

create policy "share invites visible" on public.share_invites
  for select to authenticated using (true);
create policy "create own share invite" on public.share_invites
  for insert to authenticated with check (auth.uid() = owner_id);

create index if not exists profiles_player_code_idx on public.profiles(player_code);
create index if not exists profiles_display_name_idx on public.profiles(display_name);
create index if not exists rooms_room_code_idx on public.rooms(room_code);
create index if not exists friendships_receiver_idx on public.friendships(receiver_id, status);
create index if not exists room_players_room_idx on public.room_players(room_id);
