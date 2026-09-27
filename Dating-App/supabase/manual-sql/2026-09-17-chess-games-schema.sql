-- Chess-in-chat feature — schema + RPCs.
-- MVP scope only (confirmed with SK): moves + realtime sync + check/
-- checkmate/stalemate/draw detection. No takeback requests, draw offers,
-- or per-player clocks yet — those are staged for a later pass.
--
-- Move-validation trust model (confirmed with SK): client-only. chess.js
-- runs in each browser and is the source of truth for legality/check/
-- checkmate/stalemate — this is a casual, non-monetary game, so a
-- modified client sending a bogus fen/pgn just breaks that one game for
-- the two people in it, not a security or financial issue like
-- profiles.lotus_balance was. What these RPCs DO enforce server-side is
-- authorization: only the two seated players can write to their own game
-- row, and only on their own turn — that's access control, not chess
-- rules, and skipping it would repeat tonight's lotus_balance mistake
-- (any authenticated user directly patching state that isn't theirs).
--
-- chat_id convention: matches RoomChat.jsx's getChatId(uid1, uid2) =
-- [uid1, uid2].sort().join("_") — a deterministic, two-UUID compound key,
-- not a separate chats table (this project doesn't have one). Every game
-- row is scoped to that same string.
--
-- Run this the same way as every other file in this directory: reviewed
-- by SK, then Supabase Dashboard → SQL Editor → paste → Run. NOT YET RUN.

-- ══════════════════════════════════════════════════════════════════════
-- 1. Table
-- ══════════════════════════════════════════════════════════════════════
create table public.chess_games (
  id          uuid primary key default gen_random_uuid(),
  chat_id     text not null,
  white_id    uuid not null references public.profiles(id),
  black_id    uuid not null references public.profiles(id),
  -- Starting position, standard FEN. chess.js's own default when you
  -- construct `new Chess()` with no argument — kept explicit here so the
  -- column is never null and a fresh row is immediately loadable.
  fen         text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn         text not null default '',
  turn        text not null default 'w' check (turn in ('w', 'b')),
  status      text not null default 'active'
                check (status in ('active', 'checkmate', 'stalemate', 'draw', 'resigned')),
  winner_id   uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index chess_games_chat_id_idx on public.chess_games (chat_id);

-- Only one in-progress game per chat at a time — enforced here (not just
-- in start_chess_game's own select-then-insert check below) so two
-- concurrent "start game" clicks can't race past that check and both
-- insert. A finished game (any other status) doesn't count, so a new
-- game can always be started once the last one ends.
create unique index chess_games_one_active_per_chat on public.chess_games (chat_id) where status = 'active';

-- RLS: only the two seated players can ever see this row. No INSERT or
-- UPDATE policy is defined at all — every write goes through the
-- SECURITY DEFINER RPCs below, which run as the table owner and so
-- aren't subject to RLS or to 'authenticated's table grants in the first
-- place. Tonight's profiles.lotus_balance incident was a table-level
-- GRANT that let a direct client .update() bypass the intended RPC path
-- entirely — the fix here is to never grant INSERT/UPDATE on this table
-- to 'authenticated' at all, so a direct .update() gets rejected outright
-- rather than relying on a policy to catch it.
alter table public.chess_games enable row level security;

create policy chess_games_select_players on public.chess_games
  for select
  using (auth.uid() = white_id or auth.uid() = black_id);

grant select on public.chess_games to authenticated;

-- Live sync: same mechanism the existing chat (`messages` table) already
-- uses — RoomChat.jsx subscribes with
-- supabase.channel(...).on("postgres_changes", { table: "chess_games", filter: `chat_id=eq.${chatId}` }, ...).
alter publication supabase_realtime add table public.chess_games;


-- ══════════════════════════════════════════════════════════════════════
-- 2. start_chess_game — creates the game row for a chat.
-- ══════════════════════════════════════════════════════════════════════
-- auth.uid() cross-check follows the exact pattern from tonight's
-- 2026-09-02-boost-rpc-auth-check.sql: NULL is permitted only because
-- that's this project's established SQL-editor test path with no JWT
-- context; any authenticated mismatch is rejected.
create or replace function public.start_chess_game(p_user_id uuid, p_chat_id text, p_opponent_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_white_id uuid;
  v_black_id uuid;
  v_game_id  uuid;
begin
  if auth.uid() is not null and auth.uid() != p_user_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  if p_user_id = p_opponent_id then
    return jsonb_build_object('error', 'invalid_opponent');
  end if;

  -- Coin-flip who plays white.
  if random() < 0.5 then
    v_white_id := p_user_id;
    v_black_id := p_opponent_id;
  else
    v_white_id := p_opponent_id;
    v_black_id := p_user_id;
  end if;

  begin
    insert into chess_games (chat_id, white_id, black_id)
    values (p_chat_id, v_white_id, v_black_id)
    returning id into v_game_id;
  exception when unique_violation then
    -- chess_games_one_active_per_chat caught a race between two
    -- concurrent start clicks — report it the same way the plain
    -- select-then-insert check below would have, rather than a raw
    -- Postgres error.
    return jsonb_build_object('error', 'game_already_active');
  end;

  return jsonb_build_object(
    'success', true,
    'game_id', v_game_id,
    'white_id', v_white_id,
    'black_id', v_black_id
  );
end;
$$;

grant execute on function public.start_chess_game(uuid, text, uuid) to authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 3. make_chess_move — writes a move chess.js already validated
--    client-side. Server-side, this only checks: the caller is one of
--    the two seated players, the game is still active, and it's actually
--    their turn — it does not re-run chess legality (see the trust-model
--    note at the top of this file).
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.make_chess_move(
  p_user_id   uuid,
  p_game_id   uuid,
  p_fen       text,
  p_pgn       text,
  p_next_turn text,
  p_status    text default 'active',
  p_winner_id uuid default null
)
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

  select * into v_game from chess_games where id = p_game_id for update;

  if v_game is null then
    return jsonb_build_object('error', 'game_not_found');
  end if;

  if p_user_id != v_game.white_id and p_user_id != v_game.black_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  if v_game.status != 'active' then
    return jsonb_build_object('error', 'game_not_active');
  end if;

  if (v_game.turn = 'w' and v_game.white_id != p_user_id)
     or (v_game.turn = 'b' and v_game.black_id != p_user_id) then
    return jsonb_build_object('error', 'not_your_turn');
  end if;

  update chess_games
  set fen = p_fen,
      pgn = p_pgn,
      turn = p_next_turn,
      status = p_status,
      winner_id = p_winner_id,
      updated_at = now()
  where id = p_game_id;

  return jsonb_build_object('success', true, 'status', p_status);
end;
$$;

grant execute on function public.make_chess_move(uuid, uuid, text, text, text, text, uuid) to authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 4. resign_chess_game — lets either player end an active game early, so
--    a game that's just been abandoned mid-play doesn't permanently
--    block a new one via chess_games_one_active_per_chat.
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.resign_chess_game(p_user_id uuid, p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game   public.chess_games;
  v_winner uuid;
begin
  if auth.uid() is not null and auth.uid() != p_user_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  select * into v_game from chess_games where id = p_game_id for update;

  if v_game is null then
    return jsonb_build_object('error', 'game_not_found');
  end if;

  if p_user_id != v_game.white_id and p_user_id != v_game.black_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  if v_game.status != 'active' then
    return jsonb_build_object('error', 'game_not_active');
  end if;

  v_winner := case when p_user_id = v_game.white_id then v_game.black_id else v_game.white_id end;

  update chess_games
  set status = 'resigned', winner_id = v_winner, updated_at = now()
  where id = p_game_id;

  return jsonb_build_object('success', true, 'status', 'resigned', 'winner_id', v_winner);
end;
$$;

grant execute on function public.resign_chess_game(uuid, uuid) to authenticated;


-- ── Manual verification after running ──
-- 1. As two distinct real users (a, b) sharing a chat_id:
--      select start_chess_game('<a>', '<chat_id>', '<b>');
--    Expect {"success": true, "game_id": ..., "white_id": ..., "black_id": ...}.
-- 2. Immediately try to start a second game in the same chat:
--      select start_chess_game('<a>', '<chat_id>', '<b>');
--    Expect {"error": "game_already_active"}.
-- 3. As whichever id got white_id, make a legal opening move (e.g. e2e4 —
--    compute the resulting fen/pgn with chess.js locally for this test):
--      select make_chess_move('<white_id>', '<game_id>', '<fen after e4>', '<pgn>', 'b');
--    Expect {"success": true, "status": "active"}.
-- 4. Immediately try to move again as the same (white) id:
--      select make_chess_move('<white_id>', '<game_id>', ..., 'w');
--    Expect {"error": "not_your_turn"}.
-- 5. As black, resign:
--      select resign_chess_game('<black_id>', '<game_id>');
--    Expect {"success": true, "status": "resigned", "winner_id": "<white_id>"}.
-- 6. Confirm a new game can now be started in the same chat (the unique
--    index only blocks status = 'active'):
--      select start_chess_game('<a>', '<chat_id>', '<b>');
--    Expect success again.
-- 7. As a third, uninvolved user, attempt to read/move on a's/b's game and
--    confirm RLS blocks the select and the RPC returns {"error": "unauthorized"}.
