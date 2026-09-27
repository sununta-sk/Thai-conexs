// src/components/ChessGame.jsx
// One live game between two users on /chess/:gameId (ChessMatch.jsx),
// including its 'pending' challenge stage (see
// 2026-09-27-chess-lobby-matchmaking.sql). Move legality/check/checkmate/
// stalemate/draw detection is entirely client-side via chess.js (the
// trust-model tradeoff confirmed with SK: casual non-monetary game, not
// worth server-side re-validation). The make_chess_move RPC only enforces
// who's allowed to write — one of the two seated players, on their own
// turn — matching this project's "state-changing writes go through an RPC"
// convention.
//
// Chess used to live inside the chat as well (chat_id games); SK removed
// it from the chat on 2026-09-27, so only this /chess/:gameId mode is left.
// Playing against the computer is ChessBot.jsx (/games/bot), which shares
// the board (ChessBoard.jsx) and the rules card (ChessRules.jsx).
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { supabase } from "../lib/supabaseClient";
import { useTranslation } from "../hooks/useTranslation";
import { lobbyErrorText } from "../lib/chessLobby";
import { XIcon } from "./Icons";
import ChessBoard from "./ChessBoard";
import { RulesCard } from "./ChessRules";
import { PIECE_GLYPH, kingSquare } from "../lib/chessPieces";

// Standard outline trophy — no existing icon in this codebase to reuse
// (checked), so this is a plain, generic trophy silhouette rather than a
// literal transcription of the mockup's icon.
function TrophyIcon({ stroke, size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 5H4a2 2 0 0 0 0 4h1.5" />
      <path d="M17 5h3a2 2 0 0 1 0 4h-1.5" />
    </svg>
  );
}

// Returns { title, subtitle } for the finished-game header, per end reason
// and whether the viewer won. Draws (stalemate/draw) use the "lose"
// (muted) visual language on both sides since there's no winner to
// celebrate — the title text itself still correctly reads "Draw", not
// "You Lose".
function getGameOverText(tx, status, isWinner, opponentName) {
  const name = opponentName || tx.opponent;
  if (status === "checkmate") return { title: isWinner ? tx.winTitleCheckmate : tx.loseTitleCheckmate(name), subtitle: isWinner ? tx.winSubtitle : tx.loseSubtitle };
  if (status === "resigned") return { title: isWinner ? tx.winTitleResigned(name) : tx.loseTitleResigned(name), subtitle: isWinner ? tx.winSubtitle : tx.loseSubtitle };
  if (status === "stalemate") return { title: tx.winTitleStalemate, subtitle: tx.drawSubtitle };
  if (status === "draw") return { title: tx.winTitleDraw, subtitle: tx.drawSubtitle };
  if (status === "abandoned") return { title: isWinner ? tx.winTitleAbandoned(name) : tx.loseTitleAbandoned(name), subtitle: isWinner ? tx.winSubtitle : tx.loseSubtitle };
  return { title: "", subtitle: "" };
}

// Lobby challenges expire after 90s server-side (chess_challenge /
// chess_respond_challenge); a lobby player may claim the win once it has
// been the opponent's turn for 5 minutes (chess_claim_abandoned).
const CHALLENGE_TTL_MS = 90 * 1000;
const ABANDON_MS = 5 * 60 * 1000;
const IDLE_HINT_MS = 60 * 1000;

const fmtClock = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export default function ChessGame({ gameId, session, otherUserId, otherUsername, otherAvatarUrl, onClose, onRematch }) {
  const { tx } = useTranslation(["chess"]);
  const myId = session?.user?.id;
  const [game, setGame] = useState(null); // chess_games row, or undefined once we've checked and found none
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // square string, e.g. "e2"
  const [pendingPromotion, setPendingPromotion] = useState(null); // { from, to } awaiting a piece choice
  const [error, setError] = useState("");
  const [showRules, setShowRules] = useState(false);
  const busyRef = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const [pendingSeen, setPendingSeen] = useState(null); // { id, at } — when this client first saw the row as 'pending'
  const [claimOverride, setClaimOverride] = useState(null); // { updatedAt, deadline } from a too_early answer
  const [opponentHere, setOpponentHere] = useState(null); // live presence on this game's page; null = not known yet

  // chess.js instance derived from the current game's fen — rebuilt whenever
  // the row's fen changes (either our own optimistic move or a realtime
  // update from the opponent), never mutated in place.
  const fen = game ? game.fen : null;
  const chess = useMemo(() => {
    if (!fen) return null;
    try { return new Chess(fen); } catch { return null; }
  }, [fen]);

  // Track ONE row by id: realtime + a 5s poll + a refetch on refocus (an
  // idle tab or laptop sleep can silently kill the websocket), never
  // stepping back to an older updated_at (optimistic moves keep the old
  // updated_at until the server's row arrives).
  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    const adopt = (row) => {
      if (cancelled || !row) return;
      if (row.status === "pending") {
        setPendingSeen((p) => (p && p.id === row.id ? p : { id: row.id, at: Date.now() }));
      }
      setGame((prev) => {
        if (prev && prev.id === row.id && new Date(row.updated_at) <= new Date(prev.updated_at)) return prev;
        return row;
      });
    };
    const refetch = async () => {
      const { data } = await supabase.from("chess_games").select("*").eq("id", gameId).maybeSingle();
      if (cancelled) return;
      adopt(data);
      setLoading(false);
    };
    refetch();

    const channel = supabase
      .channel(`chess-game:${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chess_games", filter: `id=eq.${gameId}` },
        (payload) => adopt(payload.new)
      )
      .subscribe();

    const poll = setInterval(refetch, 5000);
    const onVisible = () => { if (document.visibilityState === "visible") refetch(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refetch);
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refetch);
    };
  }, [gameId]);

  // Who is actually on this game's page right now, so the
  // waiting player can see "left the game page" instead of guessing.
  useEffect(() => {
    if (!gameId || !myId || !otherUserId) return;
    const channel = supabase.channel(`chess-room:${gameId}`, { config: { presence: { key: myId } } });
    channel
      .on("presence", { event: "sync" }, () => {
        setOpponentHere(Object.prototype.hasOwnProperty.call(channel.presenceState(), otherUserId));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ at: new Date().toISOString() });
      });
    return () => { supabase.removeChannel(channel); };
  }, [gameId, myId, otherUserId]);

  const myColor = game && myId === game.white_id ? "w" : game && myId === game.black_id ? "b" : null;
  const isMyTurn = game?.status === "active" && myColor === game.turn;

  // Derived timing. `now` only ticks while something on screen
  // actually counts down (pending challenge, or waiting on the opponent).
  const isPending = game?.status === "pending";
  const iAmChallenger = isPending && game.created_by === myId;
  const pendingDeadline = isPending && pendingSeen?.id === game.id ? pendingSeen.at + CHALLENGE_TTL_MS : null;
  const pendingLeftMs = pendingDeadline ? pendingDeadline - now : CHALLENGE_TTL_MS;
  const pendingExpired = isPending && pendingDeadline != null && pendingLeftMs <= 0;
  const waitingOnOpponent = game?.status === "active" && !isMyTurn && !!myColor;
  const lastChangeAt = game?.updated_at ? new Date(game.updated_at).getTime() : 0;
  const claimDeadline = claimOverride && claimOverride.updatedAt === game?.updated_at ? claimOverride.deadline : lastChangeAt + ABANDON_MS;
  const opponentIdleMs = waitingOnOpponent ? now - lastChangeAt : 0;
  const showIdleHint = waitingOnOpponent && (opponentIdleMs >= IDLE_HINT_MS || (claimOverride && claimOverride.updatedAt === game?.updated_at));
  const canClaim = waitingOnOpponent && now >= claimDeadline;
  const ticking = isPending || waitingOnOpponent;

  useEffect(() => {
    if (!ticking) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [ticking]);

  // The challenger's own client withdraws an unanswered challenge when its
  // 90s runs out, so the other player's popup closes on the same UPDATE.
  // (The server would also refuse a late accept on its own.)
  useEffect(() => {
    if (!pendingExpired || !iAmChallenger || !game?.id || !myId) return;
    supabase.rpc("chess_cancel_challenge", { p_user_id: myId, p_game_id: game.id }).then(({ data }) => {
      if (data?.success) setGame((prev) => (prev && prev.id === game.id ? { ...prev, status: "cancelled" } : prev));
    });
  }, [pendingExpired, iAmChallenger, game?.id, myId]);

  const legalTargets = useMemo(() => {
    if (!chess || !selected) return [];
    return chess.moves({ square: selected, verbose: true }).map((m) => m.to);
  }, [chess, selected]);

  const submitMove = async (from, to, promotion) => {
    if (!chess || !game || busyRef.current) return;
    const attempt = new Chess(game.fen);
    let move;
    try {
      move = attempt.move({ from, to, promotion });
    } catch {
      move = null;
    }
    if (!move) { setSelected(null); return; } // illegal move — chess.js already rejected it, nothing to send

    let status = "active";
    if (attempt.isCheckmate()) status = "checkmate";
    else if (attempt.isStalemate()) status = "stalemate";
    else if (attempt.isDraw()) status = "draw";

    const winner_id =
      status === "checkmate" ? (myColor === "w" ? game.white_id : game.black_id) : null;

    busyRef.current = true;
    setSelected(null);
    setPendingPromotion(null);
    // Optimistic local update — the realtime event for our own write will
    // arrive right after and just replace this with the identical row.
    const nextTurn = attempt.turn();
    setGame((prev) => prev && ({ ...prev, fen: attempt.fen(), pgn: attempt.pgn(), turn: nextTurn, status, winner_id }));

    const { data, error: rpcError } = await supabase.rpc("make_chess_move", {
      p_user_id: myId,
      p_game_id: game.id,
      p_fen: attempt.fen(),
      p_pgn: attempt.pgn(),
      p_next_turn: nextTurn,
      p_status: status,
      p_winner_id: winner_id,
    });
    busyRef.current = false;
    if (rpcError || data?.error) {
      setError(data?.error || tx.moveFailed);
      // Re-fetch the authoritative row rather than trusting our optimistic one.
      const { data: fresh } = await supabase.from("chess_games").select("*").eq("id", game.id).maybeSingle();
      if (fresh) setGame(fresh);
    }
  };

  const handleSquareClick = (square) => {
    if (!chess || !game || game.status !== "active" || !isMyTurn) return;
    const piece = chess.get(square);

    if (selected && legalTargets.includes(square)) {
      const movingPiece = chess.get(selected);
      const isPromotion = movingPiece?.type === "p" && (square[1] === "8" || square[1] === "1");
      if (isPromotion) { setPendingPromotion({ from: selected, to: square }); return; }
      submitMove(selected, square);
      return;
    }

    if (piece && piece.color === myColor) { setSelected(square); return; }
    setSelected(null);
  };

  const resign = async () => {
    if (!game || !myId || busyRef.current) return;
    if (!window.confirm(tx.resignConfirm)) return;
    busyRef.current = true;
    setError("");
    // Optimistic local update, same pattern as submitMove — without this
    // the resigning player's own screen had zero feedback and depended
    // entirely on a realtime round-trip (or the poll fallback) to hear
    // back their own write, which read as "I clicked Resign and nothing
    // happened."
    const winner_id = myColor === "w" ? game.black_id : game.white_id;
    setGame((prev) => prev && ({ ...prev, status: "resigned", winner_id }));

    const { data, error: rpcError } = await supabase.rpc("resign_chess_game", { p_user_id: myId, p_game_id: game.id });
    busyRef.current = false;
    if (rpcError || data?.error) {
      setError(data?.error || tx.couldntResign);
      const { data: fresh } = await supabase.from("chess_games").select("*").eq("id", game.id).maybeSingle();
      if (fresh) setGame(fresh);
    }
  };

  // ── Challenge / abandon actions ──
  const respondToChallenge = async (accept) => {
    if (!game || !myId || busyRef.current) return;
    busyRef.current = true;
    setError("");
    const { data, error: rpcError } = await supabase.rpc("chess_respond_challenge", { p_user_id: myId, p_game_id: game.id, p_accept: accept });
    busyRef.current = false;
    if (rpcError || data?.error) {
      setError(lobbyErrorText(tx, data?.error, otherUsername));
      const { data: fresh } = await supabase.from("chess_games").select("*").eq("id", game.id).maybeSingle();
      if (fresh) setGame(fresh);
      return;
    }
    if (!accept) { onClose(); return; }
    setGame((prev) => prev && ({ ...prev, status: "active" }));
  };

  const cancelChallenge = async () => {
    if (!game || !myId || busyRef.current) return;
    busyRef.current = true;
    const { data } = await supabase.rpc("chess_cancel_challenge", { p_user_id: myId, p_game_id: game.id });
    busyRef.current = false;
    if (data?.success) setGame((prev) => prev && ({ ...prev, status: "cancelled" }));
    onClose();
  };

  const claimWin = async () => {
    if (!game || !myId || busyRef.current) return;
    busyRef.current = true;
    setError("");
    const { data, error: rpcError } = await supabase.rpc("chess_claim_abandoned", { p_user_id: myId, p_game_id: game.id });
    busyRef.current = false;
    if (data?.error === "too_early") {
      setClaimOverride({ updatedAt: game.updated_at, deadline: Date.now() + (data.seconds_left || 0) * 1000 });
      return;
    }
    if (rpcError || data?.error) {
      setError(tx.couldntClaim);
      const { data: fresh } = await supabase.from("chess_games").select("*").eq("id", game.id).maybeSingle();
      if (fresh) setGame(fresh);
      return;
    }
    setGame((prev) => prev && ({ ...prev, status: "abandoned", winner_id: myId }));
  };

  // Fonts per the approved mockup — same <link> pattern RoomChat.jsx/
  // MobileRoomChat.jsx already use for Nunito.
  const fontLink = (
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Work+Sans:wght@400;500;600&display=swap" />
  );

  // Pure-CSS hover tooltip for the rules "?" button — sibling-hover rule,
  // no JS hover state needed. Injected once per instance, same pattern as
  // the @keyframes <style> blocks RoomChat.jsx/MobileRoomChat.jsx already
  // use for their own scoped CSS.
  const rulesTooltipStyle = (
    <style>{`
      .tcn-chess-rules-tooltip { opacity: 0; visibility: hidden; transition: opacity .15s; }
      .tcn-chess-rules-btn:hover .tcn-chess-rules-tooltip { opacity: 1; visibility: visible; }
    `}</style>
  );
  // Different rules-disclosure treatment per state (item 3, 2026-09-25):
  // - Live game: an always-visible "How to Play →" text link - the small
  //   hover-only "?" meant many players never discovered it. A reminder
  //   for anyone who already saw the pre-start rules and forgot.
  // - Game-over / declined: unchanged, the original compact "?" +
  //   hover tooltip (not called out in item 3, no reason to disturb it).
  const rulesModal = showRules && <RulesCard tx={tx} onClose={() => setShowRules(false)} />;
  const rulesButtonCompact = (
    <>
      {rulesTooltipStyle}
      <button className="tcn-chess-rules-btn" style={CS.rulesBtn} onClick={() => setShowRules(true)}>
        ?
        <span className="tcn-chess-rules-tooltip" style={CS.rulesTooltipLabel}>{tx.rulesTooltip}</span>
      </button>
    </>
  );
  const rulesButtonVisible = (
    <button style={CS.rulesLinkBtn} onClick={() => setShowRules(true)}>{tx.rulesTooltip} →</button>
  );

  if (loading) {
    return (
      <div style={CS.panel}>
        {fontLink}
        <div style={CS.loading}>{tx.loading}</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div style={CS.panel}>
        {fontLink}
        <div style={CS.startWrap}>
          <div style={CS.startIcon}>♟</div>
          <h3 style={CS.declinedTitle}>{tx.gameNotFound}</h3>
          <button style={CS.closeGameBtn} onClick={onClose}>{tx.lobbyBack}</button>
        </div>
      </div>
    );
  }

  // Lobby challenge, not answered yet.
  if (isPending) {
    const name = otherUsername || tx.opponent;
    return (
      <div style={CS.panel}>
        {fontLink}
        <button style={CS.closeBtn} onClick={onClose} aria-label="Close"><XIcon size={16} /></button>
        <div style={CS.startWrap}>
          <div style={CS.pendingAvatarWrap}>
            {otherAvatarUrl ? <img src={otherAvatarUrl} alt="" style={CS.pendingAvatarImg} /> : <span style={CS.startIconInline}>♟</span>}
          </div>
          <h3 style={CS.declinedTitle}>{iAmChallenger ? tx.challengeSentTitle : tx.incomingTitle(name)}</h3>
          <p style={CS.startText}>
            {pendingExpired ? tx.challengeCancelledBody : iAmChallenger ? tx.waitingAccept(name) : tx.incomingBody}
          </p>
          {error && <div style={CS.errorBanner}>{error}</div>}
          {!pendingExpired && <div style={CS.pendingTimer}>{tx.expiresIn(Math.max(0, Math.ceil(pendingLeftMs / 1000)))}</div>}
          {pendingExpired ? (
            <button style={CS.closeGameBtn} onClick={onClose}>{tx.lobbyBack}</button>
          ) : iAmChallenger ? (
            <button style={CS.secondaryBtn} onClick={cancelChallenge}>{tx.cancelChallenge}</button>
          ) : (
            <div style={CS.pendingActions}>
              <button style={CS.closeGameBtn} onClick={() => respondToChallenge(true)}>{tx.accept}</button>
              <button style={CS.secondaryBtn} onClick={() => respondToChallenge(false)}>{tx.decline}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Lobby challenge withdrawn or expired.
  if (game.status === "cancelled") {
    const iSentIt = game.created_by === myId;
    return (
      <div style={CS.panel}>
        {fontLink}
        <button style={CS.closeBtn} onClick={onClose} aria-label="Close"><XIcon size={16} /></button>
        <div style={CS.startWrap}>
          <div style={CS.startIcon}>♟</div>
          <h3 style={CS.declinedTitle}>{tx.challengeClosedTitle}</h3>
          <p style={CS.startText}>{iSentIt ? tx.challengeExpiredBody(otherUsername || tx.opponent) : tx.challengeCancelledBody}</p>
          <div style={CS.pendingActions}>
            {onRematch && <button style={CS.closeGameBtn} onClick={onRematch}>{iSentIt ? tx.challengeAgain : tx.challengeBack}</button>}
            <button style={CS.secondaryBtn} onClick={onClose}>{tx.lobbyBack}</button>
          </div>
        </div>
      </div>
    );
  }

  // Declined challenge: deliberately NOT the trophy/board game-over
  // treatment below — nobody won or lost a game that was never played, and
  // showing a full starting-position board for it would be misleading.
  if (game.status === "declined") {
    // The person who declined can also land here (e.g. refreshed the
    // page), so the copy depends on which side you were on.
    const iDeclined = game.created_by !== myId;
    return (
      <div style={CS.panel}>
        {fontLink}
        {rulesButtonCompact}
        <button style={CS.closeBtn} onClick={onClose} aria-label="Close"><XIcon size={16} /></button>
        <div style={CS.startWrap}>
          <div style={CS.startIcon}>♟</div>
          <h3 style={CS.declinedTitle}>{tx.declinedTitle}</h3>
          <p style={CS.startText}>{iDeclined ? tx.youDeclinedBody(otherUsername || tx.opponent) : tx.declinedBody(otherUsername || tx.opponent)}</p>
          <button style={CS.closeGameBtn} onClick={onClose}>{tx.lobbyBack}</button>
        </div>
        {rulesModal}
      </div>
    );
  }

  const inCheck = chess?.inCheck?.() && game.status === "active";
  const finished = game.status !== "active";
  const otherColor = myColor === "w" ? "b" : "w";
  const colorName = (c) => (c === "w" ? tx.white : tx.black);
  const isWinner = finished && game.winner_id === myId;
  const gameOver = finished ? getGameOverText(tx, game.status, isWinner, otherUsername) : null;
  // null when active or a draw (no winner) — only checkmate/resigned name a winner.
  const otherIsWinner = finished && game.winner_id != null && game.winner_id === otherUserId;
  const meIsWinner = finished && game.winner_id != null && game.winner_id === myId;
  const rowState = (isThisRowMe) => {
    if (!finished) return null; // still active — timer-pill placeholder
    // Draw (stalemate/draw): per SK, neither side gets win/lose treatment
    // — avatars stay normal/undimmed, no row tint, just a neutral "Draw"
    // tag. Falls through avatarStyle/row-background below unchanged since
    // "draw" matches neither "winner" nor "loser".
    if (game.winner_id == null) return "draw";
    const thisRowWon = isThisRowMe ? meIsWinner : otherIsWinner;
    return thisRowWon ? "winner" : "loser";
  };

  // Timer pills are visual-only for now — per-player clocks are explicitly
  // deferred past this MVP pass, so this shows a placeholder rather than a
  // fake countdown that doesn't actually tick. Once finished, that slot
  // becomes a Win/Lose/Draw tag instead.
  const renderPlayerRow = (name, color, isMe) => {
    const state = rowState(isMe);
    const avatarBase = isMe ? CS.avatarMe : CS.avatarOpp;
    const avatarStyle =
      state === "loser" ? { ...avatarBase, ...CS.avatarLoser } :
      state === "winner" && isMe ? { ...avatarBase, ...CS.avatarWinnerMine } :
      avatarBase;
    return (
      <div style={state === "winner" ? { ...CS.playerRow, ...CS.playerRowWinner } : CS.playerRow}>
        <div style={CS.playerIdentity}>
          <div style={avatarStyle}>
            {!isMe && otherAvatarUrl ? (
              <img src={otherAvatarUrl} alt="" style={CS.avatarImg} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
            )}
          </div>
          <div>
            <div style={CS.playerName}>{name}</div>
            <div style={CS.playerColorLabel}>
              ({colorName(color)})
              {!isMe && !finished && opponentHere != null && (
                <span style={opponentHere ? CS.presenceHere : CS.presenceAway}>
                  {" · "}{opponentHere ? tx.opponentHere : tx.opponentAway}
                </span>
              )}
            </div>
          </div>
        </div>
        {state === "winner" ? (
          <div style={CS.winTag}>{tx.winTag}</div>
        ) : state === "loser" ? (
          <div style={CS.loseTag}>{tx.loseTag}</div>
        ) : state === "draw" ? (
          <div style={CS.loseTag}>{tx.drawTag}</div>
        ) : (
          <div style={isMe ? CS.timerPillMe : CS.timerPillOpp}>--:--</div>
        )}
      </div>
    );
  };

  return (
    <div style={CS.panel}>
      {fontLink}
      {finished && rulesButtonCompact}
      <button style={CS.closeBtn} onClick={onClose} aria-label="Close"><XIcon size={16} /></button>

      {finished ? (
        <div style={CS.gameOverHeader}>
          <div style={{ ...CS.gameOverIconWrap, ...(isWinner ? CS.gameOverIconWin : CS.gameOverIconLose) }}>
            <TrophyIcon stroke={isWinner ? "#fbbf24" : "#c7bfe0"} size={24} />
          </div>
          <h3 style={{ ...CS.gameOverTitle, color: isWinner ? "#fbbf24" : "#c7bfe0" }}>{gameOver.title}</h3>
          <p style={CS.gameOverSubtitle}>{gameOver.subtitle}</p>
        </div>
      ) : (
        <div style={CS.liveBadgeWrap}>
          <div style={CS.liveBadge}>
            <span style={CS.liveDot} />
            <span style={CS.liveBadgeText}>{tx.liveGame}</span>
          </div>
          <div style={isMyTurn ? { ...CS.turnHint, ...CS.turnHintActive } : CS.turnHint}>
            {isMyTurn ? tx.yourMove : tx.waitingFor(otherUsername || tx.opponent)}
            {inCheck && tx.check}
          </div>
          {showIdleHint && (
            canClaim ? (
              <div style={CS.idleBox}>
                <span>{tx.idleReady(otherUsername || tx.opponent)}</span>
                <button style={CS.claimBtn} onClick={claimWin}>{tx.claimWin}</button>
              </div>
            ) : (
              <div style={CS.idleHint}>{tx.idleHint(otherUsername || tx.opponent, fmtClock(claimDeadline - now))}</div>
            )
          )}
          {rulesButtonVisible}
        </div>
      )}

      {error && <div style={CS.errorBanner}>{error}</div>}

      {renderPlayerRow(otherUsername || tx.opponent, otherColor, false)}

      <ChessBoard
        chess={chess}
        orientation={myColor === "b" ? "b" : "w"}
        selected={selected}
        targets={legalTargets}
        checkSquare={inCheck ? kingSquare(chess, game.turn) : null}
        interactive={isMyTurn && !finished}
        look={finished ? "finished" : !isMyTurn ? "dim" : "live"}
        onSquareClick={handleSquareClick}
      />

      {renderPlayerRow(tx.you, myColor, true)}

      <div style={CS.controlsRow}>
        {finished ? (
          <>
            {onRematch && <button style={CS.closeGameBtn} onClick={onRematch}>{tx.rematch}</button>}
            <button style={CS.secondaryBtn} onClick={onClose}>{tx.lobbyBack}</button>
          </>
        ) : (
          <button style={CS.resignBtn} onClick={resign}>{tx.resign}</button>
        )}
      </div>

      {pendingPromotion && (
        <div style={CS.promoOverlay} onClick={() => setPendingPromotion(null)}>
          <div style={CS.promoBox} onClick={(e) => e.stopPropagation()}>
            <div style={CS.promoTitle}>{tx.promoteTo}</div>
            <div style={CS.promoRow}>
              {["q", "r", "b", "n"].map((p) => (
                <button key={p} style={CS.promoBtn} onClick={() => submitMove(pendingPromotion.from, pendingPromotion.to, p)}>
                  {PIECE_GLYPH[myColor][p]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {rulesModal}
    </div>
  );
}

// Palette/type/measurements per the approved design-canvas mockup
// (chess_mockup_desktop.png), transcribed exactly where given. One
// exception, called out where it occurs below: anything not covered by the
// mockup at all (the outer floating panel's own border/radius/shadow, the
// close button, the target-move dot, the promotion overlay) — those are
// filled in to match the given palette rather than left in the old
// blue-gray theme, but weren't literally specified.
const CS = {
  panel: {
    position: "relative", // anchors the absolutely-positioned close button below
    // Fills whatever width RoomChat.jsx's chessColumn gives it (that's the
    // fluid, viewport-relative sizing) rather than dictating a fixed
    // pixel width itself — 568 was the mockup's single 1440px reference
    // artboard value, not a literal size for every window width.
    width: "100%", boxSizing: "border-box", padding: "20px 24px 24px",
    background: "radial-gradient(ellipse at top, #181230 0%, #0d0a18 65%)",
    border: "1px solid #2c2547", borderRadius: 20,
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
    fontFamily: "'Work Sans', sans-serif",
  },
  closeBtn: { position: "absolute", top: 14, right: 16, background: "none", border: "none", color: "#7d7196", fontSize: 16, cursor: "pointer", padding: 4, lineHeight: 1, display: "flex" },
  loading: { padding: 24, textAlign: "center", color: "#7d7196", fontSize: 13, fontWeight: 600 },
  startWrap: { padding: "24px 8px 8px", textAlign: "center" },
  startIcon: { fontSize: 40, marginBottom: 8, color: "#f0abfc" },
  startText: { color: "#c7bfe0", fontSize: 14, marginBottom: 16, fontFamily: "'Work Sans', sans-serif" },
  declinedTitle: { fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 800, color: "#f1f5f9", margin: "0 0 8px" },

  liveBadgeWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 16 },
  liveBadge: { display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: "#1c1734", border: "1px solid #ec489955" },
  liveDot: { width: 7, height: 7, borderRadius: "50%", background: "#ec4899", boxShadow: "0 0 8px #ec4899" },
  liveBadgeText: { fontFamily: "'Sora', sans-serif", fontSize: 12, fontWeight: 600, color: "#f0abfc" },
  turnHint: { fontFamily: "'Work Sans', sans-serif", fontSize: 12, color: "#7d7196" },
  // Prominent pink glow when it's the viewer's own turn — matches this
  // feature's existing glow language (live-badge pink glow, Save button
  // glow). Plain/muted (turnHint above) when waiting, unchanged.
  turnHintActive: { color: "#f0abfc", textShadow: "0 0 12px #ec489966", fontWeight: 700 },

  // Game-over header — trophy circle + title + subtitle, replaces the
  // small live-badge pill entirely once finished (see getGameOverText).
  // Sizing/margins trimmed from the mockup's original values (icon 64,
  // title 24px, header margin 16) - the full game-over stack (this header
  // + both player rows + board + buttons) was taller than a normal
  // viewport. Trimmed here plus the finished board's own size (ChessBoard
  // look="finished") rather than touching the live state, which already
  // fits fine.
  gameOverHeader: { textAlign: "center", marginBottom: 10 },
  gameOverIconWrap: { width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" },
  gameOverIconWin: { background: "#3a2f0f", border: "2px solid #fbbf24", boxShadow: "0 0 26px #fbbf2455" },
  gameOverIconLose: { background: "#1c1734", border: "2px solid #2c2547" },
  gameOverTitle: { fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 800, margin: "0 0 4px" },
  gameOverSubtitle: { fontFamily: "'Work Sans', sans-serif", fontSize: 14, color: "#9c93b5", margin: 0 },

  errorBanner: { margin: "0 0 12px", padding: "6px 10px", background: "#2c1832", border: "1px solid #ec489955", borderRadius: 8, color: "#f9a8d4", fontSize: 12, fontWeight: 600, textAlign: "center" },

  playerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: 520, margin: "0 auto 12px" },
  // Winner's row gets a subtle gold tint; loser's row keeps the plain
  // playerRow background but its avatar gets the muted treatment below.
  playerRowWinner: { background: "#3a2f0f66", borderRadius: 10, padding: "4px 8px" },
  playerIdentity: { display: "flex", alignItems: "center", gap: 10 },
  avatarOpp: { width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(140deg, #5b3a8f, #25203f)", border: "2px solid #6d5b9c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarMe: { width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(140deg, #ec4899, #a855f7)", border: "2px solid #6d5b9c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarLoser: { border: "2px solid #2c2547", opacity: 0.6, filter: "grayscale(.6)" },
  // Only the WINNER'S OWN avatar gets this extra shine (not the opponent's,
  // even when the opponent won) — per spec.
  avatarWinnerMine: { border: "2px solid #fbbf24", boxShadow: "0 0 12px #fbbf2455" },
  playerName: { fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 600, color: "#fff" },
  playerColorLabel: { fontFamily: "'Work Sans', sans-serif", fontSize: 11, color: "#7d7196" },
  timerPillOpp: { fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#f0abfc", background: "#1c1734", padding: "6px 16px", borderRadius: 10, border: "1px solid #2c2547" },
  timerPillMe: { fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#fff", background: "linear-gradient(135deg, #ec4899, #a855f7)", padding: "6px 16px", borderRadius: 10 },
  winTag: { fontFamily: "'Sora', sans-serif", fontSize: 11, fontWeight: 700, color: "#fbbf24" },
  loseTag: { fontFamily: "'Sora', sans-serif", fontSize: 11, fontWeight: 700, color: "#655a82" },

  controlsRow: { display: "flex", justifyContent: "center", gap: 12, marginTop: 20, width: "100%", maxWidth: 520, marginLeft: "auto", marginRight: "auto" },
  resignBtn: { padding: "10px 18px", borderRadius: 10, fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 600, border: "1px solid #ec489955", background: "#3a1030", color: "#f9a8d4", cursor: "pointer" },
  // Full-width per spec, replaces the old auto-width version now that this
  // is the finished-game state's primary action.
  closeGameBtn: { width: "100%", padding: "13px", borderRadius: 10, fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, border: "none", background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", cursor: "pointer" },

  // ── Lobby-mode additions ──
  avatarImg: { width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" },
  presenceHere: { color: "#4ade80" },
  presenceAway: { color: "#f9a8d4" },
  idleHint: { fontFamily: "'Work Sans', sans-serif", fontSize: 12, color: "#9c93b5", textAlign: "center", maxWidth: 420 },
  idleBox: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center", padding: "8px 12px", borderRadius: 10, background: "#2c1832", border: "1px solid #ec489955", fontFamily: "'Work Sans', sans-serif", fontSize: 12.5, color: "#f9a8d4" },
  claimBtn: { padding: "7px 14px", borderRadius: 999, border: "none", background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", fontFamily: "'Sora', sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  secondaryBtn: { width: "100%", padding: "12px", borderRadius: 10, fontFamily: "'Sora', sans-serif", fontSize: 13.5, fontWeight: 700, border: "1px solid #2c2547", background: "#1c1734", color: "#c7bfe0", cursor: "pointer" },
  pendingActions: { display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 320, margin: "0 auto" },
  pendingAvatarWrap: { width: 72, height: 72, borderRadius: "50%", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(140deg, #5b3a8f, #25203f)", border: "2px solid #ec4899", boxShadow: "0 0 24px #ec489955", overflow: "hidden" },
  pendingAvatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  startIconInline: { fontSize: 34, color: "#f0abfc" },
  pendingTimer: { display: "inline-block", marginBottom: 16, padding: "5px 12px", borderRadius: 999, background: "#1c1734", border: "1px solid #2c2547", fontFamily: "'Sora', sans-serif", fontSize: 12, fontWeight: 600, color: "#f0abfc", fontVariantNumeric: "tabular-nums" },

  promoOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  promoBox: { background: "#1c1734", border: "1px solid #2c2547", borderRadius: 16, padding: 20 },
  promoTitle: { color: "#fff", fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 10, textAlign: "center" },
  promoRow: { display: "flex", gap: 8 },
  promoBtn: { width: 44, height: 44, fontSize: 26, background: "#191428", border: "1px solid #2c2547", borderRadius: 10, cursor: "pointer", color: "#f0abfc" },

  // "?" rules button (game-over/declined only now) — placed left of the
  // existing ✕ close button. Its own position:absolute already
  // establishes a containing block for the tooltip span below, so no
  // separate position:relative is needed.
  rulesBtn: { position: "absolute", top: 12, right: 52, width: 30, height: 30, borderRadius: "50%", border: "1px solid #2c2547", background: "#1c1734", color: "#c7bfe0", fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  rulesTooltipLabel: { position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1c1734", border: "1px solid #2c2547", color: "#f2eefb", fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 11.5, padding: "6px 10px", borderRadius: 7, whiteSpace: "nowrap", pointerEvents: "none" },
  // Always-visible "How to Play →" link (live-game state only, item 3a) -
  // sits in normal flow right under the turn hint, not absolutely
  // positioned near the corner buttons like rulesBtn above (that corner
  // is cramped and this is text, not an icon).
  rulesLinkBtn: { display: "block", margin: "10px auto 0", background: "none", border: "none", color: "#f0abfc", fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 12.5, cursor: "pointer", padding: "4px 8px" },
};
