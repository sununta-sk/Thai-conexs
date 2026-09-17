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

  if (loading) {
    return <div style={CS.panel}><div style={CS.loading}>Loading chess…</div></div>;
  }

  if (!game) {
    return (
      <div style={CS.panel}>
        <div style={CS.header}>
          <span style={CS.title}>♟ Chess</span>
          <button style={CS.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={CS.startWrap}>
          <p style={CS.startText}>Challenge {otherUsername || "them"} to a game of chess?</p>
          {error && <div style={CS.error}>{error}</div>}
          <button style={CS.startBtn} onClick={startGame}>Start Game</button>
        </div>
      </div>
    );
  }

  const inCheck = chess?.inCheck?.() && game.status === "active";
  const finished = game.status !== "active";
  const winnerLabel = game.winner_id ? (game.winner_id === myId ? "You" : (otherUsername || "Opponent")) : null;
  const finishedLabel = statusLabel({ ...game, winnerLabel });

  return (
    <div style={CS.panel}>
      <div style={CS.header}>
        <span style={CS.title}>♟ Chess</span>
        <button style={CS.closeBtn} onClick={onClose}>✕</button>
      </div>

      <div style={CS.statusRow}>
        {finished ? (
          <span style={CS.finishedText}>{finishedLabel}</span>
        ) : (
          <span style={CS.turnText}>
            {isMyTurn ? "Your move" : `Waiting for ${otherUsername || "opponent"}…`}
            {inCheck && " — Check!"}
          </span>
        )}
        {!finished && (
          <button style={CS.resignBtn} onClick={resign}>Resign</button>
        )}
      </div>

      {error && <div style={CS.error}>{error}</div>}

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
                  background: isSelected ? "#e91e6355" : isDark ? "#3a4a63" : "#e8e8f0",
                  cursor: isMyTurn && !finished ? "pointer" : "default",
                }}
              >
                {piece && (
                  <span style={{ ...CS.piece, color: piece.color === "w" ? "#f8fafc" : "#0f172a", textShadow: piece.color === "w" ? "0 0 2px #000" : "none" }}>
                    {PIECE_GLYPH[piece.color][piece.type]}
                  </span>
                )}
                {isTarget && <div style={CS.targetDot} />}
              </div>
            );
          })
        )}
      </div>

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

const CS = {
  panel: { position: "absolute", bottom: 80, left: 8, zIndex: 50, width: 336, background: "#1e293b", border: "1px solid #334155", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.5)", overflow: "hidden" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #334155" },
  title: { fontSize: 14, fontWeight: 800, color: "#f1f5f9" },
  closeBtn: { background: "none", border: "none", color: "#94a3b8", fontSize: 16, cursor: "pointer", padding: 2, lineHeight: 1 },
  loading: { padding: 24, textAlign: "center", color: "#64748b", fontSize: 13, fontWeight: 600 },
  startWrap: { padding: 20, textAlign: "center" },
  startText: { color: "#cbd5e1", fontSize: 14, marginBottom: 14 },
  startBtn: { padding: "10px 20px", background: "linear-gradient(135deg, #e91e63, #c2185b)", border: "none", borderRadius: 24, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  statusRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px" },
  turnText: { fontSize: 12, fontWeight: 700, color: "#e91e63" },
  finishedText: { fontSize: 12, fontWeight: 800, color: "#4caf50" },
  resignBtn: { background: "none", border: "1px solid #ef444466", borderRadius: 14, color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "4px 10px" },
  error: { margin: "0 14px 8px", padding: "6px 10px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 8, color: "#fca5a5", fontSize: 12, fontWeight: 600 },
  board: { display: "grid", gridTemplateColumns: "repeat(8, 1fr)", width: 336, height: 336 },
  square: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "1/1" },
  piece: { fontSize: 28, lineHeight: 1, userSelect: "none" },
  targetDot: { position: "absolute", width: 12, height: 12, borderRadius: "50%", background: "rgba(233,30,99,0.55)" },
  promoOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  promoBox: { background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: 20 },
  promoTitle: { color: "#f1f5f9", fontSize: 13, fontWeight: 700, marginBottom: 10, textAlign: "center" },
  promoRow: { display: "flex", gap: 8 },
  promoBtn: { width: 44, height: 44, fontSize: 26, background: "#0f172a", border: "1px solid #334155", borderRadius: 10, cursor: "pointer", color: "#f1f5f9" },
};
