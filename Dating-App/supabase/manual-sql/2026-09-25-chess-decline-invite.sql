-- Chess: decline an invite before any move has been made.
--
-- Background: chess_games has no "who invited whom" column - only
-- white/black, assigned by coin flip in start_chess_game after the row
-- already exists. So "decline the invite" can't be scoped to a specific
-- inviter/recipient relationship server-side; instead this scopes it to
-- "an untouched game" (pgn = '', no moves made) rather than "who clicked
-- Start Game" - semantically equivalent for this feature (there's nothing
-- to decline once a move has been played; resign_chess_game is the
-- correct action past that point).
--
-- Same auth pattern as resign_chess_game (2026-09-17): only a seated
-- player may act, auth.uid() cross-check follows the established
-- NULL-permitted-only-for-SQL-editor-testing convention.
--
-- Run this the same way as every other file in this directory: reviewed
-- by SK, then Supabase Dashboard -> SQL Editor -> paste -> Run. NOT YET RUN.

-- ══════════════════════════════════════════════════════════════════════
-- 1. Widen the status check constraint to allow 'declined'.
-- ══════════════════════════════════════════════════════════════════════
alter table public.chess_games drop constraint chess_games_status_check;
alter table public.chess_games add constraint chess_games_status_check
  check (status in ('active', 'checkmate', 'stalemate', 'draw', 'resigned', 'declined'));

-- chess_games_one_active_per_chat (partial unique index on status='active')
-- is untouched - a declined game no longer counts as active, so a new
-- game can be started in that chat immediately, same as any other
-- finished status.

-- ══════════════════════════════════════════════════════════════════════
-- 2. decline_chess_invite — either seated player may decline an
--    untouched game (pgn = ''). Once a move exists, this correctly
--    refuses (resign_chess_game is the right RPC past that point).
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.decline_chess_invite(p_user_id uuid, p_game_id uuid)
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

  if v_game.pgn != '' then
    return jsonb_build_object('error', 'game_already_started');
  end if;

  update chess_games
  set status = 'declined', updated_at = now()
  where id = p_game_id;

  return jsonb_build_object('success', true, 'status', 'declined');
end;
$$;

grant execute on function public.decline_chess_invite(uuid, uuid) to authenticated;


-- ── Manual verification after running ──
-- 1. As two distinct real users (a, b) sharing a chat_id, start a game:
--      select start_chess_game('<a>', '<chat_id>', '<b>');
--    Expect {"success": true, "game_id": ..., ...}.
-- 2. As either seated player, decline it before any move:
--      select decline_chess_invite('<a_or_b>', '<game_id>');
--    Expect {"success": true, "status": "declined"}.
-- 3. Confirm a new game can now be started in the same chat immediately:
--      select start_chess_game('<a>', '<chat_id>', '<b>');
--    Expect success again (declined no longer blocks
--    chess_games_one_active_per_chat).
-- 4. Start a new game, make one legal move (see make_chess_move's own
--    verification block), then try to decline it:
--      select decline_chess_invite('<white_id>', '<game_id>');
--    Expect {"error": "game_already_started"}.
