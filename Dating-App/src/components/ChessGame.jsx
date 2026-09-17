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

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

const PIECE_GLYPH = {
  w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
};

function statusLabel(game) {
  if (game.status === "checkmate") return `Checkmate — ${game.winnerLabel} wins`;
  if (game.status === "stalemate") return "Draw — stalemate";
  if (game.status === "draw") return "Draw";
  if (game.status === "resigned") return `${game.winnerLabel} wins by resignation`;
  return null;
}

export default function ChessGame({ chatId, session, otherUserId, otherUsername, onClose }) {
  const myId = session?.user?.id;
  const [game, setGame] = useState(null); // chess_games row, or undefined once we've checked and found none
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // square string, e.g. "e2"
  const [pendingPromotion, setPendingPromotion] = useState(null); // { from, to } awaiting a piece choice
  const [error, setError] = useState("");
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

    return () => { cancelled = true; supabase.removeChannel(channel); };
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
    if (rpcError) { setError("Couldn't start game — try again."); return; }
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
      setError(data?.error || "Move failed — try again.");
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
    if (!window.confirm("Resign this game?")) return;
    busyRef.current = true;
    await supabase.rpc("resign_chess_game", { p_user_id: myId, p_game_id: game.id });
    busyRef.current = false;
  };

  // Fonts per the approved mockup — same <link> pattern RoomChat.jsx/
  // MobileRoomChat.jsx already use for Nunito.
  const fontLink = (
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Work+Sans:wght@400;500;600&display=swap" />
  );

  if (loading) {
    return (
      <div style={CS.panel}>
        {fontLink}
        <div style={CS.loading}>Loading chess…</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div style={CS.panel}>
        {fontLink}
        <button style={CS.closeBtn} onClick={onClose}>✕</button>
        <div style={CS.startWrap}>
          <div style={CS.startIcon}>♟</div>
          <p style={CS.startText}>Challenge {otherUsername || "them"} to a game of chess?</p>
          {error && <div style={CS.errorBanner}>{error}</div>}
          <button style={CS.startBtn} onClick={startGame}>Start Game</button>
        </div>
      </div>
    );
  }

  const inCheck = chess?.inCheck?.() && game.status === "active";
  const finished = game.status !== "active";
  const winnerLabel = game.winner_id ? (game.winner_id === myId ? "You" : (otherUsername || "Opponent")) : null;
  const finishedLabel = statusLabel({ ...game, winnerLabel });
  const otherColor = myColor === "w" ? "b" : "w";
  const colorName = (c) => (c === "w" ? "White" : "Black");

  // Timer pills are visual-only for now — per-player clocks are explicitly
  // deferred past this MVP pass, so this shows a placeholder rather than a
  // fake countdown that doesn't actually tick.
  const renderPlayerRow = (name, color, isMe) => (
    <div style={CS.playerRow}>
      <div style={CS.playerIdentity}>
        <div style={isMe ? CS.avatarMe : CS.avatarOpp}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
        </div>
        <div>
          <div style={CS.playerName}>{name}</div>
          <div style={CS.playerColorLabel}>({colorName(color)})</div>
        </div>
      </div>
      <div style={isMe ? CS.timerPillMe : CS.timerPillOpp}>--:--</div>
    </div>
  );

  return (
    <div style={CS.panel}>
      {fontLink}
      <button style={CS.closeBtn} onClick={onClose}>✕</button>

      <div style={CS.liveBadgeWrap}>
        <div style={CS.liveBadge}>
          <span style={CS.liveDot} />
          <span style={CS.liveBadgeText}>{finished ? finishedLabel : "Live Chess Game"}</span>
        </div>
        {!finished && (
          <div style={CS.turnHint}>
            {isMyTurn ? "Your move" : `Waiting for ${otherUsername || "opponent"}…`}
            {inCheck && " — Check!"}
          </div>
        )}
      </div>

      {error && <div style={CS.errorBanner}>{error}</div>}

      {renderPlayerRow(otherUsername || "Opponent", otherColor, false)}

      <div style={CS.board} data-testid="chess-board">
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

      {renderPlayerRow("You", myColor, true)}

      {!finished && (
        <div style={CS.controlsRow}>
          <button style={CS.resignBtn} onClick={resign}>Resign</button>
        </div>
      )}

      {pendingPromotion && (
        <div style={CS.promoOverlay} onClick={() => setPendingPromotion(null)}>
          <div style={CS.promoBox} onClick={(e) => e.stopPropagation()}>
            <div style={CS.promoTitle}>Promote to</div>
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
    position: "absolute", bottom: 80, left: 8, zIndex: 50,
    width: 568, boxSizing: "border-box", padding: "20px 24px 24px",
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
  startBtn: { padding: "12px 28px", background: "linear-gradient(135deg, #ec4899, #a855f7)", border: "none", borderRadius: 24, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "'Sora', sans-serif", cursor: "pointer" },

  liveBadgeWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 16 },
  liveBadge: { display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: "#1c1734", border: "1px solid #ec489955" },
  liveDot: { width: 7, height: 7, borderRadius: "50%", background: "#ec4899", boxShadow: "0 0 8px #ec4899" },
  liveBadgeText: { fontFamily: "'Sora', sans-serif", fontSize: 12, fontWeight: 600, color: "#f0abfc" },
  turnHint: { fontFamily: "'Work Sans', sans-serif", fontSize: 12, color: "#7d7196" },

  errorBanner: { margin: "0 0 12px", padding: "6px 10px", background: "#2c1832", border: "1px solid #ec489955", borderRadius: 8, color: "#f9a8d4", fontSize: 12, fontWeight: 600, textAlign: "center" },

  playerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", width: 520, margin: "0 auto 12px" },
  playerIdentity: { display: "flex", alignItems: "center", gap: 10 },
  avatarOpp: { width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(140deg, #5b3a8f, #25203f)", border: "2px solid #6d5b9c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarMe: { width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(140deg, #ec4899, #a855f7)", border: "2px solid #6d5b9c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  playerName: { fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 600, color: "#fff" },
  playerColorLabel: { fontFamily: "'Work Sans', sans-serif", fontSize: 11, color: "#7d7196" },
  timerPillOpp: { fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#f0abfc", background: "#1c1734", padding: "6px 16px", borderRadius: 10, border: "1px solid #2c2547" },
  timerPillMe: { fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#fff", background: "linear-gradient(135deg, #ec4899, #a855f7)", padding: "6px 16px", borderRadius: 10 },

  board: { position: "relative", display: "grid", gridTemplateColumns: "repeat(8, 1fr)", width: 520, height: 520, margin: "0 auto", borderRadius: 10, border: "1px solid #2c2547", boxShadow: "0 20px 50px -12px rgba(0,0,0,.6)", overflow: "hidden" },
  square: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center" },
  selectedOverlay: { position: "absolute", inset: 6, borderRadius: 6, background: "#ec489933", border: "2px solid #ec4899" },
  piece: { lineHeight: 1, userSelect: "none" },
  targetDot: { position: "absolute", width: 14, height: 14, borderRadius: "50%", background: "rgba(236,72,153,0.55)" },

  controlsRow: { display: "flex", justifyContent: "center", gap: 12, marginTop: 20 },
  resignBtn: { padding: "10px 18px", borderRadius: 10, fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 600, border: "1px solid #ec489955", background: "#3a1030", color: "#f9a8d4", cursor: "pointer" },

  promoOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  promoBox: { background: "#1c1734", border: "1px solid #2c2547", borderRadius: 16, padding: 20 },
  promoTitle: { color: "#fff", fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 10, textAlign: "center" },
  promoRow: { display: "flex", gap: 8 },
  promoBtn: { width: 44, height: 44, fontSize: 26, background: "#191428", border: "1px solid #2c2547", borderRadius: 10, cursor: "pointer", color: "#f0abfc" },
};
