-- ============================================================
-- FRUIT SLICE: FINAL 4-MODE LEADERBOARD FIX
-- Run this once in Supabase SQL Editor.
-- Supports: Classic, Time Attack, Zen, Challenge + combo scores.
-- ============================================================

-- Ensure the existing leaderboard has the required columns.
alter table public.fruit_slice_leaderboard
  add column if not exists player_name text;
alter table public.fruit_slice_leaderboard
  add column if not exists game_mode text not null default 'classic';
alter table public.fruit_slice_leaderboard
  add column if not exists combo integer not null default 0;

-- Clean up old overloaded functions that caused the RPC ambiguity.
drop function if exists public.submit_fruit_slice_score(integer);
drop function if exists public.submit_fruit_slice_score(integer, text);
drop function if exists public.submit_fruit_slice_score(integer, text, integer);

create function public.submit_fruit_slice_score(
  p_score integer,
  p_game_mode text,
  p_combo integer
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_name text;
  v_mode text;
  v_combo integer;
begin
  if p_score is null or p_score < 0 or p_score > 1000000 then
    raise exception 'Invalid score';
  end if;

  v_mode := lower(coalesce(p_game_mode, 'classic'));
  if v_mode not in ('classic', 'time', 'zen', 'challenge') then
    v_mode := 'classic';
  end if;

  v_combo := greatest(0, least(coalesce(p_combo, 0), 999));

  select coalesce(username, 'Player')
    into v_player_name
    from public.profiles
   where id = auth.uid();

  v_player_name := coalesce(v_player_name, 'Player');

  insert into public.fruit_slice_leaderboard (player_name, score, game_mode, combo)
  values (v_player_name, p_score, v_mode, v_combo);

  return json_build_object(
    'score', p_score,
    'game_mode', v_mode,
    'combo', v_combo
  );
end;
$$;

-- Let signed-in players submit scores.
grant execute on function public.submit_fruit_slice_score(integer, text, integer) to authenticated;

-- Public leaderboard reading.
alter table public.fruit_slice_leaderboard enable row level security;
drop policy if exists fruit_slice_public_read on public.fruit_slice_leaderboard;
create policy fruit_slice_public_read
on public.fruit_slice_leaderboard
for select
to anon, authenticated
using (true);

create index if not exists fruit_slice_score_idx
on public.fruit_slice_leaderboard (score desc);
