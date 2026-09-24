// src/components/ChessGame.jsx
// Chess-in-chat, desktop MVP. Move legality/check/checkmate/stalemate/draw
// detection is entirely client-side via chess.js (the trust-model tradeoff
// confirmed with SK: casual non-monetary game, not worth server-side
// re-validation). The make_chess_move RPC only enforces who's allowed to
// write — one of the two seated players, on their own turn — matching this
// project's "state-changing writes go through an RPC" convention.
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { supabase } from "../lib/supabaseClient";
import { useTranslation } from "../hooks/useTranslation";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

const PIECE_GLYPH = {
  w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
};

// Standard outline trophy — no existing icon in this codebase to reuse
// (checked), so this is a plain, generic trophy silhouette rather than a
// literal transcription of the mockup's icon.
function TrophyIcon({ stroke }) {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 5H4a2 2 0 0 0 0 4h1.5" />
      <path d="M17 5h3a2 2 0 0 1 0 4h-1.5" />
    </svg>
  );
}

const RULE_KEYS = ["Pawn", "Knight", "Bishop", "Rook", "Queen", "King"];

function RulesCard({ tx, onClose }) {
  return (
    <div style={CS.rulesOverlay} onClick={onClose}>
      <div style={CS.rulesCardBox} onClick={(e) => e.stopPropagation()}>
        <div style={CS.rulesHeaderRow}>
          <span style={CS.rulesHeaderTitle}>{tx.rulesTitle}</span>
          <button style={CS.rulesCloseBtn} onClick={onClose}>✕</button>
        </div>
        <div style={CS.rulesGoalLine}>{tx.rulesGoal}</div>
        <div style={CS.rulesList}>
          {RULE_KEYS.map((k) => (
            <div key={k} style={CS.rulesRow}>
              <div style={CS.rulesRowName}>{tx[`ruleName${k}`]}</div>
              <div style={CS.rulesRowDesc}>{tx[`ruleDesc${k}`]}</div>
            </div>
          ))}
        </div>
        <div style={CS.rulesTipBox}>{tx.rulesTip}</div>
      </div>
    </div>
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
  return { title: "", subtitle: "" };
}

export default function ChessGame({ chatId, session, otherUserId, otherUsername, onClose }) {
  const { tx } = useTranslation(["chess"]);
  const myId = session?.user?.id;
  const [game, setGame] = useState(null); // chess_games row, or undefined once we've checked and found none
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // square string, e.g. "e2"
  const [pendingPromotion, setPendingPromotion] = useState(null); // { from, to } awaiting a piece choice
  const [error, setError] = useState("");
  const [showRules, setShowRules] = useState(false);
  const busyRef = useRef(false);

  // chess.js instance derived from the current game's fen — rebuilt whenever
  // the row's fen changes (either our own optimistic move or a realtime
  // update from the opponent), never mutated in place.
  const fen = game ? game.fen : null;
  const chess = useMemo(() => {
    if (!fen) return null;
    try { return new Chess(fen); } catch { return null; }
  }, [fen]);

  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;
    // Boundary for the poll's from-null discovery decision below: a game
    // created at/after this moment is one this component started watching
    // for, whatever its status is by the time the poll actually runs; a
    // game created before it is history from a prior session and must
    // never be resurrected regardless of status.
    const mountedAt = new Date();
    supabase
      .from("chess_games")
      .select("*")
      .eq("chat_id", chatId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setGame(data || null);
        setLoading(false);
      });

    const channel = supabase
      .channel(`chess:${chatId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chess_games", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          if (payload.eventType === "DELETE") { setGame(null); return; }
          setGame((prev) => {
            // Ignore a stale event for a game we've already moved past
            // (e.g. arriving after a newer game already started).
            // TODO(known MVP gap, accepted by SK): this only guards against a
            // stale event for a DIFFERENT (older) game id — it does nothing
            // for two out-of-order events on the SAME game id, so a
            // reordered websocket delivery could briefly apply an older move
            // after a newer one. Low-probability (Realtime delivers one
            // ordered stream per subscription) and low-impact (make_chess_move
            // still validates server-side, so this can only cause a
            // transient display glitch, never a bad write) — if picked up
            // later, fix by comparing `payload.new.updated_at` against
            // `prev.updated_at` and dropping the event if it's not newer.
            if (prev && prev.id !== payload.new.id && prev.status === "active") return prev;
            return payload.new;
          });
        }
      )
      .subscribe();

    // Fallback for a dropped/stale realtime socket — the same class of bug
    // already found and fixed for RoomChat.jsx's chess-invite channel
    // (confirmed root cause of the 2026-09-18 regression report): an idle
    // tab or laptop sleep can silently kill the websocket with no visible
    // indicator, which would otherwise mean an opponent's move never
    // arrives here and the board looks permanently stuck on the wrong
    // player's turn. Re-fetches the authoritative row on an interval, and
    // immediately when the tab regains visibility/focus - the moment a
    // stale socket is actually likely to exist - merging it in only if
    // it's actually newer than what's already shown (same reordering
    // guard as the realtime handler above, keyed on updated_at instead of
    // game id since this is refreshing the SAME game, not switching games).
    const pollForUpdate = async () => {
      if (cancelled) return;
      // No status filter, deliberately: this has to catch the CURRENTLY
      // shown game transitioning to a non-active status (resigned,
      // checkmate, stalemate, draw) too, not just find an active game to
      // discover. "Most recent row for this chat" is always the right one
      // to track - only one active game can exist per chat at a time (DB-
      // enforced), and a new one can only start after this component has
      // already shown the previous one as finished, so this can never pick
      // up a stale older game out from under the merge check below. (A
      // status filter here was carried over from RoomChat.jsx's
      // checkForActiveGame, whose job actually IS "is there a new active
      // game" - the wrong filter for this component's different job.)
      const { data } = await supabase
        .from("chess_games")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data || cancelled) return;
      setGame((prev) => {
        // prev===null needs to distinguish two different cases (confirmed
        // live, 2026-09-24):
        // 1. An OLD, ALREADY-FINISHED game sitting in this chat's history
        //    ("ITEM 1" regression) - must NOT be adopted here, or a stale
        //    game-over screen leaks in and auto-closes 4s later. Discovery
        //    of a *finished* game is the initial fetch's job alone (it
        //    filters status='active').
        // 2. A genuinely NEW active game whose realtime INSERT event this
        //    client missed (e.g. a subscribe-race right as chess was
        //    opened, or a dropped socket) - found live: opponent starts
        //    and resigns a game from a separate client while this one sits
        //    on the "Start Game" screen with `prev` still null; without
        //    this poll adopting it, the screen never updates and the 4s
        //    auto-close timer never starts, since `isFinished` depends on
        //    `game` ever being set at all. This is exactly the safety-net
        //    role the poll is supposed to play for a missed realtime
        //    event, same as RoomChat.jsx's own chess-invite poll.
        // Checking data.status==='active' here does NOT reliably tell
        // these apart (confirmed live: a fast start-then-resign can
        // already be non-active by the time the poll runs, wrongly
        // rejecting a legitimate case 2) - what actually distinguishes
        // them is whether the game was created before or after this
        // component started watching (mountedAt, captured above).
        if (!prev) return new Date(data.created_at) >= mountedAt ? data : prev;
        if (prev.id !== data.id) return data;
        if (new Date(data.updated_at) <= new Date(prev.updated_at)) return prev;
        return data;
      });
    };
    pollForUpdate();
    const poll = setInterval(pollForUpdate, 5000);
    const onVisible = () => { if (document.visibilityState === 'visible') pollForUpdate(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', pollForUpdate);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', pollForUpdate);
    };
  }, [chatId]);

  const startGame = async () => {
    if (!myId || !otherUserId || busyRef.current) return;
    busyRef.current = true;
    setError("");
    const { data, error: rpcError } = await supabase.rpc("start_chess_game", {
      p_user_id: myId,
      p_chat_id: chatId,
      p_opponent_id: otherUserId,
    });
    busyRef.current = false;
    if (rpcError) { setError(tx.couldntStart); return; }
    if (data?.error === "game_already_active") {
      // Someone (possibly the opponent) started one a moment ago — just
      // re-fetch instead of erroring, the realtime subscription above will
      // also pick it up shortly.
      const { data: existing } = await supabase.from("chess_games").select("*").eq("id", data.game_id).maybeSingle();
      if (existing) setGame(existing);
      return;
    }
    if (data?.error) { setError(data.error); return; }
    setGame({
      id: data.game_id,
      chat_id: chatId,
      white_id: data.white_id,
      black_id: data.black_id,
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      pgn: "",
      turn: "w",
      status: "active",
      winner_id: null,
    });
  };

  const myColor = game && myId === game.white_id ? "w" : game && myId === game.black_id ? "b" : null;
  const isMyTurn = game?.status === "active" && myColor === game.turn;

  const legalTargets = useMemo(() => {
    if (!chess || !selected) return [];
    return chess.moves({ square: selected, verbose: true }).map((m) => m.to);
  }, [chess, selected]);

  // Auto-close 4s after THIS client's own local state first reflects a
  // terminal status — deliberately not synced to the other player or to
  // when the game actually ended server-side: if this client only learns
  // about it late (e.g. via the poll fallback), its own 4s starts from
  // that later moment. onClose is read through a ref rather than being a
  // dependency - it's a new closure every parent render (RoomChat.jsx's
  // message poll re-renders every 1s), and depending on it directly would
  // reset this timer before it could ever fire. isFinished is a hook (not
  // the later `finished` const below `if (!game) return`) so it can live
  // here, unconditionally, before those early returns.
  const isFinished = !!game && game.status !== "active";
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!isFinished) return;
    const timer = setTimeout(() => onCloseRef.current(), 4000);
    return () => clearTimeout(timer);
  }, [isFinished]);

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
  // Shared across every state that has a close button (pre-start, live,
  // game-over, declined) so "?" is consistently available - a player may
  // want to check the rules before starting or after a game ends, not
  // only mid-game. Not in the loading flash (sub-second, nothing to add
  // chrome to). Defined once here, before the early returns, since
  // showRules/setShowRules and rulesTooltipStyle already are too.
  const rulesButton = (
    <>
      {rulesTooltipStyle}
      <button className="tcn-chess-rules-btn" style={CS.rulesBtn} onClick={() => setShowRules(true)}>
        ?
        <span className="tcn-chess-rules-tooltip" style={CS.rulesTooltipLabel}>{tx.rulesTooltip}</span>
      </button>
      {showRules && <RulesCard tx={tx} onClose={() => setShowRules(false)} />}
    </>
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
        {rulesButton}
        <button style={CS.closeBtn} onClick={onClose}>✕</button>
        <div style={CS.startWrap}>
          <div style={CS.startIcon}>♟</div>
          <p style={CS.startText}>{tx.challengePrompt(otherUsername || tx.opponent)}</p>
          {error && <div style={CS.errorBanner}>{error}</div>}
          <button style={CS.startBtn} onClick={startGame}>{tx.startGame}</button>
        </div>
      </div>
    );
  }

  // Declined invite: deliberately NOT the trophy/board game-over treatment
  // below — nobody won or lost a game that was never played, and showing
  // a full starting-position board for it would be misleading. isFinished
  // (computed earlier, before the early returns) already covers this
  // status too, so the 4s auto-close still applies here unchanged.
  if (game.status === "declined") {
    return (
      <div style={CS.panel}>
        {fontLink}
        {rulesButton}
        <button style={CS.closeBtn} onClick={onClose}>✕</button>
        <div style={CS.startWrap}>
          <div style={CS.startIcon}>♟</div>
          <h3 style={CS.declinedTitle}>{tx.declinedTitle}</h3>
          <p style={CS.startText}>{tx.declinedBody(otherUsername || tx.opponent)}</p>
          <button style={CS.closeGameBtn} onClick={onClose}>{tx.closeGame}</button>
        </div>
        <div style={CS.autoCloseNote}>{tx.autoCloseNote}</div>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
          </div>
          <div>
            <div style={CS.playerName}>{name}</div>
            <div style={CS.playerColorLabel}>({colorName(color)})</div>
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
      {rulesButton}
      <button style={CS.closeBtn} onClick={onClose}>✕</button>

      {finished ? (
        <div style={CS.gameOverHeader}>
          <div style={{ ...CS.gameOverIconWrap, ...(isWinner ? CS.gameOverIconWin : CS.gameOverIconLose) }}>
            <TrophyIcon stroke={isWinner ? "#fbbf24" : "#c7bfe0"} />
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
        </div>
      )}

      {error && <div style={CS.errorBanner}>{error}</div>}

      {renderPlayerRow(otherUsername || tx.opponent, otherColor, false)}

      <div
        style={{
          ...CS.board,
          ...(finished ? CS.boardFinished : !isMyTurn ? CS.boardDim : null),
        }}
        data-testid="chess-board"
      >
        {RANKS.map((rank) =>
          FILES.map((file) => {
            const square = `${file}${rank}`;
            const piece = chess?.get(square);
            const isDark = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 1;
            const isSelected = selected === square;
            const isTarget = legalTargets.includes(square);
            return (
              <div
                key={square}
                data-square={square}
                onClick={() => handleSquareClick(square)}
                style={{
                  ...CS.square,
                  background: isDark ? "#191428" : "#2b2547",
                  cursor: isMyTurn && !finished ? "pointer" : "default",
                }}
              >
                {isSelected && <div style={CS.selectedOverlay} />}
                {piece && (
                  <span style={{ ...CS.piece, fontSize: piece.type === "p" ? 32 : 38, color: piece.color === "w" ? "#f0abfc" : "#e9def2" }}>
                    {PIECE_GLYPH[piece.color][piece.type]}
                  </span>
                )}
                {isTarget && <div style={CS.targetDot} />}
              </div>
            );
          })
        )}
      </div>

      {renderPlayerRow(tx.you, myColor, true)}

      <div style={CS.controlsRow}>
        {finished ? (
          <button style={CS.closeGameBtn} onClick={onClose}>{tx.closeGame}</button>
        ) : (
          <button style={CS.resignBtn} onClick={resign}>{tx.resign}</button>
        )}
      </div>
      {finished && <div style={CS.autoCloseNote}>{tx.autoCloseNote}</div>}

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
  closeBtn: { position: "absolute", top: 14, right: 16, background: "none", border: "none", color: "#7d7196", fontSize: 16, cursor: "pointer", padding: 4, lineHeight: 1 },
  loading: { padding: 24, textAlign: "center", color: "#7d7196", fontSize: 13, fontWeight: 600 },
  startWrap: { padding: "24px 8px 8px", textAlign: "center" },
  startIcon: { fontSize: 40, marginBottom: 8, color: "#f0abfc" },
  startText: { color: "#c7bfe0", fontSize: 14, marginBottom: 16, fontFamily: "'Work Sans', sans-serif" },
  declinedTitle: { fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 800, color: "#f1f5f9", margin: "0 0 8px" },
  startBtn: { padding: "12px 28px", background: "linear-gradient(135deg, #ec4899, #a855f7)", border: "none", borderRadius: 24, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "'Sora', sans-serif", cursor: "pointer" },

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
  gameOverHeader: { textAlign: "center", marginBottom: 16 },
  gameOverIconWrap: { width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" },
  gameOverIconWin: { background: "#3a2f0f", border: "2px solid #fbbf24", boxShadow: "0 0 26px #fbbf2455" },
  gameOverIconLose: { background: "#1c1734", border: "2px solid #2c2547" },
  gameOverTitle: { fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 800, margin: "0 0 6px" },
  gameOverSubtitle: { fontFamily: "'Work Sans', sans-serif", fontSize: 14, color: "#9c93b5", margin: 0 },
  autoCloseNote: { textAlign: "center", fontFamily: "'Work Sans', sans-serif", fontSize: 11, color: "#655a82", marginTop: 10 },

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

  // min(520px, 100%) caps the board at the mockup's reference size as a
  // MAXIMUM, not a fixed value — it shrinks with the panel below that.
  // aspect-ratio keeps it square without a hardcoded height.
  board: { position: "relative", display: "grid", gridTemplateColumns: "repeat(8, 1fr)", width: "min(520px, 100%)", aspectRatio: "1", margin: "0 auto", borderRadius: 10, border: "1px solid #2c2547", boxShadow: "0 20px 50px -12px rgba(0,0,0,.6)", overflow: "hidden", transition: "opacity .2s, filter .2s" },
  // Not your turn: subtle dim, pieces stay legible. Finished: fully inert
  // (grayscale(1)), takes precedence over the not-your-turn dim.
  boardDim: { opacity: 0.55, filter: "grayscale(.3)" },
  boardFinished: { opacity: 0.45, filter: "grayscale(1)" },
  square: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center" },
  selectedOverlay: { position: "absolute", inset: 6, borderRadius: 6, background: "#ec489933", border: "2px solid #ec4899" },
  piece: { lineHeight: 1, userSelect: "none" },
  targetDot: { position: "absolute", width: 14, height: 14, borderRadius: "50%", background: "rgba(236,72,153,0.55)" },

  controlsRow: { display: "flex", justifyContent: "center", gap: 12, marginTop: 20, width: "100%", maxWidth: 520, marginLeft: "auto", marginRight: "auto" },
  resignBtn: { padding: "10px 18px", borderRadius: 10, fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 600, border: "1px solid #ec489955", background: "#3a1030", color: "#f9a8d4", cursor: "pointer" },
  // Full-width per spec, replaces the old auto-width version now that this
  // is the finished-game state's primary action.
  closeGameBtn: { width: "100%", padding: "13px", borderRadius: 10, fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, border: "none", background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", cursor: "pointer" },

  promoOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  promoBox: { background: "#1c1734", border: "1px solid #2c2547", borderRadius: 16, padding: 20 },
  promoTitle: { color: "#fff", fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 10, textAlign: "center" },
  promoRow: { display: "flex", gap: 8 },
  promoBtn: { width: 44, height: 44, fontSize: 26, background: "#191428", border: "1px solid #2c2547", borderRadius: 10, cursor: "pointer", color: "#f0abfc" },

  // "?" rules button — placed left of the existing ✕ close button. Its own
  // position:absolute already establishes a containing block for the
  // tooltip span below, so no separate position:relative is needed.
  rulesBtn: { position: "absolute", top: 12, right: 52, width: 30, height: 30, borderRadius: "50%", border: "1px solid #2c2547", background: "#1c1734", color: "#c7bfe0", fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  rulesTooltipLabel: { position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1c1734", border: "1px solid #2c2547", color: "#f2eefb", fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 11.5, padding: "6px 10px", borderRadius: 7, whiteSpace: "nowrap", pointerEvents: "none" },

  // Rules card overlay — scoped to the panel (inset:0 within panel's own
  // position:relative), not a full-viewport fixed overlay like promoOverlay.
  rulesOverlay: { position: "absolute", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", borderRadius: 20 },
  rulesCardBox: { width: 520, maxWidth: "calc(100% - 32px)", maxHeight: "calc(100% - 32px)", overflowY: "auto", boxSizing: "border-box", background: "#151027", border: "1px solid #2c2547", borderRadius: 16, padding: "24px 24px 20px", boxShadow: "0 20px 50px -14px rgba(0,0,0,.6)" },
  rulesHeaderRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  rulesHeaderTitle: { fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700, color: "#fff" },
  rulesCloseBtn: { width: 26, height: 26, borderRadius: "50%", border: "1px solid #2c2547", background: "#1c1734", color: "#7d7196", fontSize: 13, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  rulesGoalLine: { fontFamily: "'Work Sans', sans-serif", fontSize: 13.5, color: "#c7bfe0", margin: "0 0 16px" },
  rulesList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 },
  rulesRow: { background: "#1c1734", border: "1px solid #2c2547", borderRadius: 10, padding: "9px 12px" },
  rulesRowName: { fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 },
  rulesRowDesc: { fontFamily: "'Work Sans', sans-serif", fontSize: 12.5, color: "#9c93b5" },
  rulesTipBox: { background: "#1c173466", border: "1px solid #2c254799", borderRadius: 10, padding: "10px 12px", fontFamily: "'Work Sans', sans-serif", fontSize: 12.5, color: "#9c93b5" },
};
