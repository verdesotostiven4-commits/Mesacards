-- MesaCards online auth/profile fix
-- Run this once in Supabase SQL Editor if Online cannot connect after enabling Anonymous sign-ins.

create policy if not exists "users insert own profile" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

create or replace function public.ensure_profile(
  p_display_name text default null,
  p_avatar text default '🦊'
)
returns public.profiles as $$
declare
  existing public.profiles;
  clean_name text;
  final_name text;
  suffix text;
begin
  select * into existing from public.profiles where id = auth.uid();
  if found then
    return existing;
  end if;

  clean_name := trim(coalesce(p_display_name, 'Jugador'));
  if char_length(clean_name) < 3 then
    clean_name := 'Jugador';
  end if;
  clean_name := substring(clean_name from 1 for 12);
  suffix := upper(substring(encode(gen_random_bytes(2), 'hex') from 1 for 4));
  final_name := substring(clean_name || suffix from 1 for 18);

  insert into public.profiles (id, player_code, display_name, avatar)
  values (auth.uid(), public.generate_player_code(), final_name, coalesce(p_avatar, '🦊'))
  returning * into existing;

  return existing;
end;
$$ language plpgsql security definer;

grant execute on function public.ensure_profile(text, text) to authenticated;
