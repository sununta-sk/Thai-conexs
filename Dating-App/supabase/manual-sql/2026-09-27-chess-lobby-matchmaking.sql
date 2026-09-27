-- Chess Phase 2 — standalone /chess page + online matchmaking.
--
-- Builds on 2026-09-17-chess-games-schema.sql and
-- 2026-09-25-chess-decline-invite.sql (both must already be run). The
-- chess-in-chat flow keeps working exactly as before: every existing row
-- becomes mode = 'chat', and nothing here changes start_chess_game,
-- make_chess_move, resign_chess_game or decline_chess_invite.
--
-- What's new:
--   * chess_games.mode ('chat' | 'lobby'). Lobby games are between any two
--     users, so they have no chat_id (NULL) and never show up in a chat's
--     chess panel (those all filter on chat_id).
--   * chess_games.created_by — who sent a lobby challenge (the chat flow
--     never needed it; left NULL there).
--   * New statuses: 'pending' (challenge sent, waiting for accept),
--     'cancelled' (challenger withdrew / challenge expired after 90s),
--     'abandoned' (opponent went quiet for 5+ min on their own turn and
--     the other player claimed the win).
--   * chess_queue — who is pressing "Quick Match" right now. Only the RPCs
--     below touch it (RLS on, no policies).
--   * RPCs: chess_quick_match, chess_leave_queue, chess_challenge,
--     chess_respond_challenge, chess_cancel_challenge,
--     chess_claim_abandoned.
--
-- Trust model is unchanged from the chat MVP: chess.js on the client is
-- the source of truth for legality; the RPCs only enforce who may write
-- what (seated players, correct turn, one lobby game per person at a
-- time, no pairing between people who blocked each other, no bots).
--
-- Grants: every function in this file is revoked from PUBLIC/anon and
-- granted to authenticated only. The auth.uid() cross-check keeps this
-- project's convention (NULL = SQL-editor test path), and with anon
-- revoked that NULL path is only reachable from the SQL editor /
-- service role, never from the public anon key. Section 9 applies the
-- same revoke to the four existing chess RPCs.
--
-- Run it like every other file here: SK reviews, then Supabase Dashboard
-- → SQL Editor → paste → Run. Safe to run once. NOT YET RUN.

-- ══════════════════════════════════════════════════════════════════════
-- 1. chess_games: mode, created_by, nullable chat_id, new statuses
-- ══════════════════════════════════════════════════════════════════════
alter table public.chess_games
  add column if not exists mode text not null default 'chat',
  add column if not exists created_by uuid references public.profiles(id);

alter table public.chess_games drop constraint if exists chess_games_mode_check;
alter table public.chess_games add constraint chess_games_mode_check
  check (mode in ('chat', 'lobby'));

alter table public.chess_games alter column chat_id drop not null;

-- A chat game always has its chat_id; a lobby game never has one. Every
-- existing row is a chat game with a chat_id, so this validates cleanly.
alter table public.chess_games drop constraint if exists chess_games_mode_chat_id_check;
alter table public.chess_games add constraint chess_games_mode_chat_id_check
  check ((mode = 'chat' and chat_id is not null) or (mode = 'lobby' and chat_id is null));

alter table public.chess_games drop constraint if exists chess_games_status_check;
alter table public.chess_games add constraint chess_games_status_check
  check (status in ('pending', 'active', 'checkmate', 'stalemate', 'draw', 'resigned', 'declined', 'cancelled', 'abandoned'));

-- chess_games_one_active_per_chat (unique on chat_id where status='active')
-- is untouched: lobby rows have chat_id NULL and NULLs never collide.

-- Lookups for "does this player already have a lobby game going?"
create index if not exists chess_games_lobby_white_idx on public.chess_games (white_id)
  where mode = 'lobby' and status in ('pending', 'active');
create index if not exists chess_games_lobby_black_idx on public.chess_games (black_id)
  where mode = 'lobby' and status in ('pending', 'active');


-- ══════════════════════════════════════════════════════════════════════
-- 2. chess_queue — Quick Match waiting list
-- ══════════════════════════════════════════════════════════════════════
-- The lobby calls chess_quick_match every ~3s while searching; each call
-- refreshes last_ping_at. Anyone who hasn't pinged for 15s (closed the
-- tab, lost connection) is ignored and purged, so nobody gets matched
-- with a ghost.
create table if not exists public.chess_queue (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  last_ping_at timestamptz not null default now()
);

alter table public.chess_queue enable row level security;
-- No policies and no table grants on purpose: only the SECURITY DEFINER
-- RPCs below read or write it.


-- ══════════════════════════════════════════════════════════════════════
-- 3. chess_quick_match — join the queue, or get paired with the person
--    who has been waiting longest.
--    Returns one of:
--      {"status":"in_game","game_id":...}   already in an active lobby game
--      {"status":"matched","game_id":...,"white_id":...,"black_id":...}
--      {"status":"queued"}                  nobody to pair with yet
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.chess_quick_match(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_id  uuid;
  v_opp      uuid;
  v_white_id uuid;
  v_black_id uuid;
begin
  if auth.uid() is not null and auth.uid() != p_user_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  -- One lock for every lobby state change (matching, challenges,
  -- accepting). Lobby traffic is small, and serializing it is what makes
  -- "never pair the same waiting person twice" and "one lobby game per
  -- person" hold without race conditions.
  perform pg_advisory_xact_lock(hashtext('chess_lobby'));

  select id into v_game_id
  from chess_games
  where mode = 'lobby' and status = 'active'
    and (white_id = p_user_id or black_id = p_user_id)
  order by created_at desc
  limit 1;

  if v_game_id is not null then
    delete from chess_queue where user_id = p_user_id;
    return jsonb_build_object('status', 'in_game', 'game_id', v_game_id);
  end if;

  delete from chess_queue where last_ping_at < now() - interval '15 seconds';

  select q.user_id into v_opp
  from chess_queue q
  join profiles p on p.id = q.user_id
  where q.user_id <> p_user_id
    and coalesce(p.is_bot, false) = false
    and not exists (
      select 1 from user_blocks b
      where (b.blocker_id = p_user_id and b.blocked_id = q.user_id)
         or (b.blocker_id = q.user_id and b.blocked_id = p_user_id)
    )
    and not exists (
      select 1 from chess_games g
      where g.mode = 'lobby' and g.status = 'active'
        and (g.white_id = q.user_id or g.black_id = q.user_id)
    )
  order by q.joined_at
  limit 1;

  if v_opp is null then
    insert into chess_queue (user_id) values (p_user_id)
    on conflict (user_id) do update set last_ping_at = now();
    return jsonb_build_object('status', 'queued');
  end if;

  delete from chess_queue where user_id in (p_user_id, v_opp);

  if random() < 0.5 then
    v_white_id := p_user_id; v_black_id := v_opp;
  else
    v_white_id := v_opp; v_black_id := p_user_id;
  end if;

  insert into chess_games (mode, chat_id, white_id, black_id, created_by, status)
  values ('lobby', null, v_white_id, v_black_id, p_user_id, 'active')
  returning id into v_game_id;

  return jsonb_build_object(
    'status', 'matched',
    'game_id', v_game_id,
    'white_id', v_white_id,
    'black_id', v_black_id
  );
end;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- 4. chess_leave_queue — "Cancel" on the searching screen / leaving /chess
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.chess_leave_queue(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() != p_user_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;
  delete from chess_queue where user_id = p_user_id;
  return jsonb_build_object('success', true);
end;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- 5. chess_challenge — invite one specific online player. Creates a
--    'pending' lobby game; the other player accepts/declines it with
--    chess_respond_challenge. A challenge expires after 90 seconds.
--    Errors: invalid_opponent, opponent_unavailable (bot, missing, or
--    blocked either way — deliberately one generic answer so a block is
--    never revealed), already_in_game (+game_id), opponent_busy,
--    cooldown (they declined you in the last 60s).
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.chess_challenge(p_user_id uuid, p_opponent_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_id  uuid;
  v_white_id uuid;
  v_black_id uuid;
begin
  if auth.uid() is not null and auth.uid() != p_user_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  if p_opponent_id is null or p_user_id = p_opponent_id then
    return jsonb_build_object('error', 'invalid_opponent');
  end if;

  perform pg_advisory_xact_lock(hashtext('chess_lobby'));

  -- Expire challenges nobody answered in time.
  update chess_games set status = 'cancelled', updated_at = now()
  where mode = 'lobby' and status = 'pending' and created_at < now() - interval '90 seconds';

  if not exists (select 1 from profiles where id = p_opponent_id and coalesce(is_bot, false) = false) then
    return jsonb_build_object('error', 'opponent_unavailable');
  end if;

  if exists (
    select 1 from user_blocks b
    where (b.blocker_id = p_user_id and b.blocked_id = p_opponent_id)
       or (b.blocker_id = p_opponent_id and b.blocked_id = p_user_id)
  ) then
    return jsonb_build_object('error', 'opponent_unavailable');
  end if;

  select id into v_game_id
  from chess_games
  where mode = 'lobby' and status = 'active'
    and (white_id = p_user_id or black_id = p_user_id)
  limit 1;
  if v_game_id is not null then
    return jsonb_build_object('error', 'already_in_game', 'game_id', v_game_id);
  end if;

  if exists (
    select 1 from chess_games
    where mode = 'lobby' and status = 'active'
      and (white_id = p_opponent_id or black_id = p_opponent_id)
  ) then
    return jsonb_build_object('error', 'opponent_busy');
  end if;

  if exists (
    select 1 from chess_games
    where mode = 'lobby' and status = 'declined' and created_by = p_user_id
      and (white_id = p_opponent_id or black_id = p_opponent_id)
      and updated_at > now() - interval '60 seconds'
  ) then
    return jsonb_build_object('error', 'cooldown');
  end if;

  -- They already challenged us and it's still open: that's a yes from
  -- both sides, so start that game instead of creating a second invite.
  select id into v_game_id
  from chess_games
  where mode = 'lobby' and status = 'pending' and created_by = p_opponent_id
    and (white_id = p_user_id or black_id = p_user_id)
  order by created_at desc
  limit 1;
  if v_game_id is not null then
    update chess_games set status = 'cancelled', updated_at = now()
    where mode = 'lobby' and status = 'pending' and id <> v_game_id
      and (created_by = p_user_id or created_by = p_opponent_id);
    update chess_games set status = 'active', updated_at = now() where id = v_game_id;
    delete from chess_queue where user_id in (p_user_id, p_opponent_id);
    return jsonb_build_object('success', true, 'status', 'active', 'game_id', v_game_id);
  end if;

  -- One open challenge per sender: a new one replaces the old one.
  update chess_games set status = 'cancelled', updated_at = now()
  where mode = 'lobby' and status = 'pending' and created_by = p_user_id;

  if random() < 0.5 then
    v_white_id := p_user_id; v_black_id := p_opponent_id;
  else
    v_white_id := p_opponent_id; v_black_id := p_user_id;
  end if;

  insert into chess_games (mode, chat_id, white_id, black_id, created_by, status)
  values ('lobby', null, v_white_id, v_black_id, p_user_id, 'pending')
  returning id into v_game_id;

  return jsonb_build_object('success', true, 'status', 'pending', 'game_id', v_game_id);
end;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- 6. chess_respond_challenge — the challenged player accepts or declines.
--    Errors: game_not_found, unauthorized, not_pending (+status),
--    challenge_expired, already_in_game (+game_id), opponent_busy.
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.chess_respond_challenge(p_user_id uuid, p_game_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game     public.chess_games;
  v_other    uuid;
  v_existing uuid;
begin
  if auth.uid() is not null and auth.uid() != p_user_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  perform pg_advisory_xact_lock(hashtext('chess_lobby'));

  select * into v_game from chess_games where id = p_game_id for update;

  if v_game.id is null then
    return jsonb_build_object('error', 'game_not_found');
  end if;

  if v_game.mode != 'lobby'
     or (p_user_id != v_game.white_id and p_user_id != v_game.black_id)
     or p_user_id = v_game.created_by then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  if v_game.status != 'pending' then
    return jsonb_build_object('error', 'not_pending', 'status', v_game.status);
  end if;

  if v_game.created_at < now() - interval '90 seconds' then
    update chess_games set status = 'cancelled', updated_at = now() where id = p_game_id;
    return jsonb_build_object('error', 'challenge_expired');
  end if;

  if not coalesce(p_accept, false) then
    update chess_games set status = 'declined', updated_at = now() where id = p_game_id;
    return jsonb_build_object('success', true, 'status', 'declined');
  end if;

  v_other := v_game.created_by;

  select id into v_existing
  from chess_games
  where mode = 'lobby' and status = 'active'
    and (white_id = p_user_id or black_id = p_user_id)
  limit 1;
  if v_existing is not null then
    return jsonb_build_object('error', 'already_in_game', 'game_id', v_existing);
  end if;

  if exists (
    select 1 from chess_games
    where mode = 'lobby' and status = 'active'
      and (white_id = v_other or black_id = v_other)
  ) then
    update chess_games set status = 'cancelled', updated_at = now() where id = p_game_id;
    return jsonb_build_object('error', 'opponent_busy');
  end if;

  -- Starting this game closes any other open challenge either of them had.
  update chess_games set status = 'cancelled', updated_at = now()
  where mode = 'lobby' and status = 'pending' and id <> p_game_id
    and (white_id in (p_user_id, v_other) or black_id in (p_user_id, v_other));

  update chess_games set status = 'active', updated_at = now() where id = p_game_id;
  delete from chess_queue where user_id in (p_user_id, v_other);

  return jsonb_build_object('success', true, 'status', 'active', 'game_id', p_game_id);
end;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- 7. chess_cancel_challenge — the challenger withdraws before an answer.
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.chess_cancel_challenge(p_user_id uuid, p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.chess_games;
begin
  if auth.uid() is not null and auth.uid() != p_user_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  perform pg_advisory_xact_lock(hashtext('chess_lobby'));

  select * into v_game from chess_games where id = p_game_id for update;

  if v_game.id is null then
    return jsonb_build_object('error', 'game_not_found');
  end if;

  if v_game.mode != 'lobby' or v_game.created_by is distinct from p_user_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  if v_game.status != 'pending' then
    return jsonb_build_object('error', 'not_pending', 'status', v_game.status);
  end if;

  update chess_games set status = 'cancelled', updated_at = now() where id = p_game_id;
  return jsonb_build_object('success', true, 'status', 'cancelled');
end;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- 8. chess_claim_abandoned — when it has been the OPPONENT's turn for 5+
--    minutes with no move, the waiting player may end the game as a win.
--    Stops a stranger who closed the app from leaving the other person
--    stuck in an "active" game forever (which would also block them from
--    starting any new lobby game). Works for chat games too, although the
--    UI only offers it on the /chess page.
--    Errors: game_not_found, unauthorized, game_not_active,
--    not_opponents_turn, too_early (+seconds_left).
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.chess_claim_abandoned(p_user_id uuid, p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game    public.chess_games;
  v_my_turn text;
  v_left    integer;
begin
  if auth.uid() is not null and auth.uid() != p_user_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  select * into v_game from chess_games where id = p_game_id for update;

  if v_game.id is null then
    return jsonb_build_object('error', 'game_not_found');
  end if;

  if p_user_id != v_game.white_id and p_user_id != v_game.black_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  if v_game.status != 'active' then
    return jsonb_build_object('error', 'game_not_active');
  end if;

  v_my_turn := case when p_user_id = v_game.white_id then 'w' else 'b' end;
  if v_game.turn = v_my_turn then
    return jsonb_build_object('error', 'not_opponents_turn');
  end if;

  if v_game.updated_at > now() - interval '5 minutes' then
    v_left := ceil(extract(epoch from (v_game.updated_at + interval '5 minutes' - now())))::integer;
    return jsonb_build_object('error', 'too_early', 'seconds_left', v_left);
  end if;

  update chess_games
  set status = 'abandoned', winner_id = p_user_id, updated_at = now()
  where id = p_game_id;

  return jsonb_build_object('success', true, 'status', 'abandoned', 'winner_id', p_user_id);
end;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- 9. Grants — authenticated only, for the new RPCs and the four existing
--    chess RPCs. (Postgres grants EXECUTE on new functions to PUBLIC, and
--    Supabase's default privileges also grant it to anon directly, so both
--    are revoked explicitly.)
-- ══════════════════════════════════════════════════════════════════════
revoke execute on function public.chess_quick_match(uuid) from public, anon;
revoke execute on function public.chess_leave_queue(uuid) from public, anon;
revoke execute on function public.chess_challenge(uuid, uuid) from public, anon;
revoke execute on function public.chess_respond_challenge(uuid, uuid, boolean) from public, anon;
revoke execute on function public.chess_cancel_challenge(uuid, uuid) from public, anon;
revoke execute on function public.chess_claim_abandoned(uuid, uuid) from public, anon;

grant execute on function public.chess_quick_match(uuid) to authenticated;
grant execute on function public.chess_leave_queue(uuid) to authenticated;
grant execute on function public.chess_challenge(uuid, uuid) to authenticated;
grant execute on function public.chess_respond_challenge(uuid, uuid, boolean) to authenticated;
grant execute on function public.chess_cancel_challenge(uuid, uuid) to authenticated;
grant execute on function public.chess_claim_abandoned(uuid, uuid) to authenticated;

revoke execute on function public.start_chess_game(uuid, text, uuid) from public, anon;
revoke execute on function public.make_chess_move(uuid, uuid, text, text, text, text, uuid) from public, anon;
revoke execute on function public.resign_chess_game(uuid, uuid) from public, anon;
revoke execute on function public.decline_chess_invite(uuid, uuid) from public, anon;


-- ── Manual verification after running ──
-- Use two real, non-bot users a and b who have not blocked each other.
-- 1. Quick match:
--      select chess_quick_match('<a>');   -- {"status":"queued"}
--      select chess_quick_match('<b>');   -- {"status":"matched","game_id":G1,...}
--      select chess_quick_match('<a>');   -- {"status":"in_game","game_id":G1}
-- 2. While G1 is active, a challenge from a is refused:
--      select chess_challenge('<a>', '<b>');  -- {"error":"already_in_game",...}
--    Resign G1 so both are free again:
--      select resign_chess_game('<a>', 'G1');
-- 3. Challenge + decline + cooldown:
--      select chess_challenge('<a>', '<b>');                -- pending, game_id G2
--      select chess_respond_challenge('<b>', 'G2', false);  -- declined
--      select chess_challenge('<a>', '<b>');                -- {"error":"cooldown"}
-- 4. Challenge + accept (after the 60s cooldown, or from b to a):
--      select chess_challenge('<b>', '<a>');                -- pending G3
--      select chess_respond_challenge('<a>', 'G3', true);   -- active
--      select make_chess_move(...)                          -- works as before
-- 5. Abandon claim: on G3, make one move as white, then as white:
--      select chess_claim_abandoned('<white>', 'G3');       -- too_early
--    (after 5 quiet minutes it returns success / status 'abandoned')
-- 6. Chat games are unaffected: start_chess_game(...) in a chat still
--    works and its row has mode = 'chat'.
-- 7. As anon (e.g. curl the REST rpc endpoint with only the anon key):
--    every chess RPC now returns "permission denied for function".
