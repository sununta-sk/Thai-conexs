-- Games page leaderboard (chess) — one read-only RPC.
--
-- chess_games rows are only readable by their two players (RLS), so a
-- board ranking everybody has to be computed server-side. This SECURITY
-- DEFINER function returns ONLY aggregated stats plus the public display
-- fields Discover already shows (username, photo) — never individual
-- games, opponents or moves.
--
-- Scoring: win = 3 points, draw (stalemate/draw) = 1, loss = 0. Counts
-- every finished chess game — in-chat and /chess lobby alike — with
-- status checkmate / resigned / stalemate / draw / abandoned.
-- Anti-farming: a game only counts once it reached move 5 (the FEN's
-- fullmove counter), so two accounts can't pile up points with instant
-- resigns or abandoned openings.
-- Bots and currently-banned accounts are left off the board.
--
-- p_period: 'day' (today, Bangkok time), 'month' (this calendar month,
-- Bangkok time) or 'all'. Returns the top p_limit (max 50) and, when the
-- caller is ranked below that, the caller's own row as well (is_me =
-- true), so the page can show "your rank".
--
-- Run: Supabase Dashboard → SQL Editor → paste → Run. Safe to run again.
-- NOT YET RUN.

create or replace function public.chess_leaderboard(p_period text default 'month', p_limit integer default 20)
returns table (
  rank        integer,
  user_id     uuid,
  username    text,
  avatar      jsonb,
  points      integer,
  wins        integer,
  draws       integer,
  losses      integer,
  games       integer,
  last_played timestamptz,
  is_me       boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select case p_period
             when 'day'   then date_trunc('day',   now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok'
             when 'month' then date_trunc('month', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok'
             else '-infinity'::timestamptz
           end as since,
           least(greatest(coalesce(p_limit, 20), 1), 50) as lim
  ),
  finished as (
    select g.white_id, g.black_id, g.winner_id, g.updated_at
    from chess_games g, bounds b
    where g.status in ('checkmate', 'resigned', 'stalemate', 'draw', 'abandoned')
      and g.updated_at >= b.since
      and case when split_part(g.fen, ' ', 6) ~ '^[0-9]+$'
               then split_part(g.fen, ' ', 6)::integer else 0 end >= 5
  ),
  per_player as (
    select white_id as uid, winner_id, updated_at from finished
    union all
    select black_id as uid, winner_id, updated_at from finished
  ),
  agg as (
    select uid,
           count(*) filter (where winner_id = uid)                          as wins,
           count(*) filter (where winner_id is null)                        as draws,
           count(*) filter (where winner_id is not null and winner_id <> uid) as losses,
           count(*)                                                         as games,
           max(updated_at)                                                  as last_played
    from per_player
    group by uid
  ),
  ranked as (
    select a.*,
           (a.wins * 3 + a.draws) as points,
           p.username,
           coalesce(nullif(to_jsonb(p.avatar_url), 'null'::jsonb), to_jsonb(p.photos) -> 0) as avatar,
           row_number() over (
             order by (a.wins * 3 + a.draws) desc, a.wins desc, a.losses asc, a.last_played asc, a.uid
           ) as pos
    from agg a
    join profiles p on p.id = a.uid
    where coalesce(p.is_bot, false) = false
      and not (p.ban_reason is not null and (p.banned_until is null or p.banned_until > now()))
  )
  select r.pos::integer, r.uid, r.username, r.avatar, r.points::integer,
         r.wins::integer, r.draws::integer, r.losses::integer, r.games::integer,
         r.last_played, (r.uid = auth.uid())
  from ranked r, bounds b
  where r.pos <= b.lim or r.uid = auth.uid()
  order by r.pos;
$$;

revoke execute on function public.chess_leaderboard(text, integer) from public, anon;
grant execute on function public.chess_leaderboard(text, integer) to authenticated;

-- ── Manual check after running ──
--   select * from chess_leaderboard('all', 20);
-- Expect one row per player who has finished at least one game that
-- reached move 5, best first. (From the SQL editor is_me is always false:
-- there's no signed-in user there.)
