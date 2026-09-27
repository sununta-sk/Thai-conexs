// src/lib/chessPieces.js — board constants shared by ChessBoard.jsx,
// ChessGame.jsx (live games) and ChessBot.jsx (games against the computer).

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
export const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

export const PIECE_GLYPH = {
  w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
};

// Square of `color`'s king (e.g. "e1"), for the in-check highlight.
export function kingSquare(chess, color) {
  if (!chess) return null;
  return chess.findPiece({ type: "k", color })[0] || null;
}
