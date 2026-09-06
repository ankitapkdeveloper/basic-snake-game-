-- ============================================================
-- FRUIT SLICE - SUPABASE LEADERBOARD SETUP
-- Run this entire script in Supabase SQL Editor.
-- ============================================================

-- 1. Create leaderboard table
create table if not exists public.fruit_slice_leaderboard (
  id bigint generated always as identity primary key,
  player_name text not null check (char_length(player_name) between 2 and 20),
  score integer not null check (score >= 0),
  game_mode text not null check (game_mode in ('classic', 'time_attack', 'zen', 'challenge')),
  combo integer not null default 0 check (combo >= 0),
  created_at timestamptz not null default now()
);

-- 2. Helpful indexes
create index if not exists fruit_slice_leaderboard_score_idx
on public.fruit_slice_leaderboard (game_mode, score desc, created_at asc);

create index if not exists fruit_slice_leaderboard_created_idx
on public.fruit_slice_leaderboard (created_at desc);

-- 3. Enable Row Level Security
alter table public.fruit_slice_leaderboard enable row level security;

-- 4. Anyone can view leaderboard scores
drop policy if exists "Anyone can view Fruit Slice leaderboard"
on public.fruit_slice_leaderboard;

create policy "Anyone can view Fruit Slice leaderboard"
on public.fruit_slice_leaderboard
for select
to anon, authenticated
using (true);

-- 5. Allow score submission
-- NOTE: Client-side score validation cannot fully prevent cheating.
-- For stronger anti-cheat protection, submit scores through a Supabase Edge Function.
drop policy if exists "Anyone can submit Fruit Slice scores"
on public.fruit_slice_leaderboard;

create policy "Anyone can submit Fruit Slice scores"
on public.fruit_slice_leaderboard
for insert
to anon, authenticated
with check (
  char_length(player_name) between 2 and 20
  and score >= 0
  and combo >= 0
  and game_mode in ('classic', 'time_attack', 'zen', 'challenge')
);

-- 6. Prevent public updates and deletes
-- No UPDATE or DELETE policies are intentionally created.

-- 7. Leaderboard view: top 100 scores per game mode
create or replace view public.fruit_slice_top_scores as
select
  id,
  player_name,
  score,
  game_mode,
  combo,
  created_at,
  row_number() over (
    partition by game_mode
    order by score desc, created_at asc
  ) as rank
from public.fruit_slice_leaderboard;

-- 8. Optional cleanup function: keep leaderboard compact
-- Keeps the top 500 scores for each game mode.
create or replace function public.cleanup_fruit_slice_leaderboard()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.fruit_slice_leaderboard
  where id in (
    select id
    from (
      select
        id,
        row_number() over (
          partition by game_mode
          order by score desc, created_at asc
        ) as rn
      from public.fruit_slice_leaderboard
    ) ranked
    where rn > 500
  );
end;
$$;

-- ============================================================
-- TEST QUERY
-- ============================================================
-- select * from public.fruit_slice_top_scores
-- where game_mode = 'classic'
-- order by rank
-- limit 20;
