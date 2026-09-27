// src/components/ChessBoard.jsx — the 8×8 board, shared by live games
// (ChessGame.jsx) and games against the computer (ChessBot.jsx). Purely
// visual: the parent owns the chess.js position and decides what a tap does.
import { FILES, RANKS, PIECE_GLYPH } from "../lib/chessPieces";

// look: "live" (normal), "dim" (not your turn: pieces stay legible) or
// "finished" (fully inert, slightly smaller so the game-over stack fits a
// normal viewport). fitHeight (px): also cap the board at the viewport
// height minus this much, so the whole game (rows + buttons) fits on a
// short laptop screen without scrolling.
export default function ChessBoard({
  chess,
  orientation = "w",
  selected = null,
  targets = [],
  lastMove = null,
  checkSquare = null,
  interactive = false,
  look = "live",
  fitHeight = 0,
  onSquareClick,
}) {
  const cap = look === "finished" ? 440 : 520;
  const width = fitHeight ? `min(${cap}px, 100%, max(280px, calc(100dvh - ${fitHeight}px)))` : `min(${cap}px, 100%)`;
  // Black sees the board from its own side.
  const ranks = orientation === "b" ? [...RANKS].reverse() : RANKS;
  const files = orientation === "b" ? [...FILES].reverse() : FILES;
  return (
    <div
      className="tcn-cb"
      style={{ ...B.board, ...(look === "finished" ? B.boardFinished : look === "dim" ? B.boardDim : null), width }}
      data-testid="chess-board"
    >
      {/* Pieces scale with the board itself (container units), with a
          viewport-based fallback for browsers without them. */}
      <style>{`
        .tcn-cb { container-type: inline-size; }
        .tcn-cb-piece { font-size: min(38px, 8.6vw); font-size: min(38px, 7.4cqw); }
        .tcn-cb-pawn { font-size: min(32px, 7.2vw); font-size: min(32px, 6.3cqw); }
      `}</style>
      {ranks.map((rank) =>
        files.map((file) => {
          const square = `${file}${rank}`;
          const piece = chess?.get(square);
          const isDark = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 1;
          const isTarget = targets.includes(square);
          const isLast = !!lastMove && (lastMove.from === square || lastMove.to === square);
          return (
            <div
              key={square}
              data-square={square}
              onClick={() => onSquareClick?.(square)}
              style={{ ...B.square, background: isDark ? "#191428" : "#2b2547", cursor: interactive ? "pointer" : "default" }}
            >
              {isLast && <div style={B.lastMove} />}
              {checkSquare === square && <div style={B.check} />}
              {selected === square && <div style={B.selectedOverlay} />}
              {piece && (
                <span className={piece.type === "p" ? "tcn-cb-pawn" : "tcn-cb-piece"} style={{ ...B.piece, color: piece.color === "w" ? "#f0abfc" : "#e9def2" }}>
                  {PIECE_GLYPH[piece.color][piece.type]}
                </span>
              )}
              {isTarget && <div style={piece ? B.targetRing : B.targetDot} />}
            </div>
          );
        })
      )}
    </div>
  );
}

// Palette from the approved chess mockup (chess_mockup_desktop.png).
const B = {
  // Width (set in the component) caps the board at the mockup's 520px as a
  // MAXIMUM — it shrinks with its container below that; aspect-ratio keeps
  // it square. Explicit equal rows too: with only columns defined, ranks
  // holding pieces came out taller than empty ones.
  board: { position: "relative", display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gridTemplateRows: "repeat(8, 1fr)", aspectRatio: "1", margin: "0 auto", borderRadius: 10, border: "1px solid #2c2547", boxShadow: "0 20px 50px -12px rgba(0,0,0,.6)", overflow: "hidden", transition: "opacity .2s, filter .2s" },
  boardDim: { opacity: 0.55, filter: "grayscale(.3)" },
  boardFinished: { opacity: 0.45, filter: "grayscale(1)" },
  square: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 0, minHeight: 0 },
  lastMove: { position: "absolute", inset: 0, background: "rgba(250, 204, 21, 0.16)" },
  check: { position: "absolute", inset: 0, background: "radial-gradient(circle, rgba(239,68,68,.75) 0%, rgba(239,68,68,.25) 55%, transparent 75%)" },
  selectedOverlay: { position: "absolute", inset: 6, borderRadius: 6, background: "#ec489933", border: "2px solid #ec4899" },
  piece: { position: "relative", lineHeight: 1, userSelect: "none" },
  targetDot: { position: "absolute", width: 14, height: 14, borderRadius: "50%", background: "rgba(236,72,153,0.55)" },
  // A capture: ring the whole square so the piece underneath stays visible.
  targetRing: { position: "absolute", inset: 3, borderRadius: "50%", border: "3px solid rgba(236,72,153,0.65)" },
};
