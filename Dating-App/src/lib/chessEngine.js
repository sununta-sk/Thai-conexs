// src/lib/chessEngine.js — the computer opponent for /games/bot (ChessBot.jsx).
// Runs inside chessBot.worker.js so thinking never freezes the page (and on
// the main thread only as a fallback if workers aren't available).
//
// A small classic engine: alpha-beta search with a capture-only quiescence
// search, iterative deepening against a time budget, and material +
// piece-square-table evaluation (the well-known "simplified evaluation
// function" tables). Three levels:
//   easy   — looks one move ahead with a lot of randomness: grabs loose
//            pieces, misses tactics, sometimes just plays a random move.
//   medium — two moves ahead + captures, a little randomness.
//   hard   — searches as deep as ~1.5s allows (usually 4 moves + captures).
//
// For speed it drives chess.js's internal move generator (_moves /
// _makeMove / _undoMove / _board / _hash — present in chess.js 1.4.0, which
// package-lock pins). If a future chess.js drops those, pickMove() falls
// back to the public API with a one-move lookahead, so the bot keeps
// working, just weaker.
import { Chess } from "chess.js";

export const BOT_LEVELS = ["easy", "medium", "hard"];

const LEVEL = {
  easy: { depth: 1, quiesce: false, timeMs: 400, noise: 110, blunder: 0.18 },
  medium: { depth: 2, quiesce: true, timeMs: 900, noise: 12, blunder: 0 },
  hard: { depth: 6, quiesce: true, timeMs: 1500, noise: 0, blunder: 0 },
};

const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE = 100000;
const INF = 1e9;
const TIMEOUT = Symbol("timeout");

// Piece-square tables from White's point of view, index 0 = a8 … 63 = h1.
const PST = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
  kEnd: [
    -50, -40, -30, -20, -20, -30, -40, -50,
    -30, -20, -10, 0, 0, -10, -20, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -30, 0, 0, 0, 0, -30, -30,
    -50, -30, -30, -30, -30, -30, -30, -50,
  ],
};

const FILES = "abcdefgh";
const algebraic = (sq) => FILES[sq & 15] + (8 - (sq >> 4));
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

function hasInternals(c) {
  return typeof c._moves === "function" && typeof c._makeMove === "function" &&
    typeof c._undoMove === "function" && typeof c._isKingAttacked === "function" &&
    Array.isArray(c._board) && c._kings && typeof c._turn === "string";
}

// Static evaluation in centipawns from the side to move's point of view.
function evaluate(c) {
  const board = c._board;
  let mg = 0; // White minus Black, kings excluded
  let phase = 0; // non-pawn material left on the board
  let wBishops = 0, bBishops = 0, wMat = 0, bMat = 0;
  let wKing = -1, bKing = -1;
  for (let sq = 0; sq < 120; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const p = board[sq];
    if (!p) continue;
    const row = sq >> 4, col = sq & 7;
    if (p.type === "k") {
      if (p.color === "w") wKing = sq; else bKing = sq;
      continue;
    }
    const idx = p.color === "w" ? row * 8 + col : (7 - row) * 8 + col;
    const v = VALUE[p.type] + PST[p.type][idx];
    if (p.type !== "p") phase += VALUE[p.type];
    if (p.color === "w") { mg += v; wMat += VALUE[p.type]; if (p.type === "b") wBishops++; }
    else { mg -= v; bMat += VALUE[p.type]; if (p.type === "b") bBishops++; }
  }
  if (wBishops >= 2) mg += 30;
  if (bBishops >= 2) mg -= 30;

  const endgame = phase <= 1400;
  const kTable = endgame ? PST.kEnd : PST.k;
  if (wKing >= 0) mg += kTable[(wKing >> 4) * 8 + (wKing & 7)];
  if (bKing >= 0) mg -= kTable[(7 - (bKing >> 4)) * 8 + (bKing & 7)];

  // Mop-up: when one side is clearly winning an endgame, drive the losing
  // king to the edge and bring the winning king close, so won endings get
  // converted into mate instead of shuffling.
  if (endgame && wKing >= 0 && bKing >= 0 && Math.abs(wMat - bMat) >= 300) {
    const loser = wMat > bMat ? bKing : wKing;
    const winner = wMat > bMat ? wKing : bKing;
    const lr = loser >> 4, lc = loser & 7, wr = winner >> 4, wc = winner & 7;
    const centerDist = Math.max(3 - lr, lr - 4) + Math.max(3 - lc, lc - 4);
    const kingDist = Math.abs(lr - wr) + Math.abs(lc - wc);
    const bonus = 10 * centerDist + 4 * (14 - kingDist);
    mg += wMat > bMat ? bonus : -bonus;
  }
  return c._turn === "w" ? mg : -mg;
}

// Captures first (most valuable victim, least valuable attacker), then
// promotions; `first` (the previous iteration's best) goes to the front.
function orderMoves(moves, first) {
  const score = (m) => {
    if (first && m.from === first.from && m.to === first.to && m.promotion === first.promotion) return 1e6;
    let s = 0;
    if (m.captured) s += 10 * VALUE[m.captured] - VALUE[m.piece] + 1000;
    if (m.promotion) s += VALUE[m.promotion];
    return s;
  };
  return moves.map((m) => [score(m), m]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
}

function makeContext(deadline) {
  return { deadline, nodes: 0 };
}

function tick(ctx) {
  if ((++ctx.nodes & 1023) === 0 && now() > ctx.deadline) throw TIMEOUT;
}

function quiesce(c, alpha, beta, ctx, ply) {
  tick(ctx);
  const stand = evaluate(c);
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  if (ply > 12) return alpha;
  const us = c._turn;
  const moves = orderMoves(c._moves({ legal: false }).filter((m) => m.captured || m.promotion === "q"));
  for (const m of moves) {
    c._makeMove(m);
    if (c._isKingAttacked(us)) { c._undoMove(); continue; }
    const score = -quiesce(c, -beta, -alpha, ctx, ply + 1);
    c._undoMove();
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function search(c, depth, alpha, beta, ctx, ply, useQ, seen) {
  tick(ctx);
  if (ply > 0) {
    if (c._halfMoves >= 100) return 0;
    if (seen && c._hash !== undefined && seen.has(c._hash)) return 0; // repetition
  }
  if (depth <= 0) return useQ ? quiesce(c, alpha, beta, ctx, ply) : evaluate(c);

  const us = c._turn;
  const moves = orderMoves(c._moves({ legal: false }));
  let legal = 0;
  if (seen && c._hash !== undefined) seen.add(c._hash);
  try {
    for (const m of moves) {
      c._makeMove(m);
      if (c._isKingAttacked(us)) { c._undoMove(); continue; }
      legal++;
      const score = -search(c, depth - 1, -beta, -alpha, ctx, ply + 1, useQ, seen);
      c._undoMove();
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
  } finally {
    if (seen && c._hash !== undefined) seen.delete(c._hash);
  }
  if (legal === 0) return c._isKingAttacked(us) ? -MATE + ply : 0;
  return alpha;
}

// Scores every root move at `depth`. With `exact` each move gets a full
// window (true scores, needed when noise is added afterwards); otherwise
// plain alpha-beta (only the best move's score is exact — fine for hard).
function scoreRoot(c, rootMoves, depth, ctx, useQ, seen, exact) {
  const us = c._turn;
  let alpha = -INF;
  const scored = [];
  for (const m of rootMoves) {
    c._makeMove(m);
    if (c._isKingAttacked(us)) { c._undoMove(); continue; }
    let score;
    try {
      score = -search(c, depth - 1, -INF, exact ? INF : -alpha, ctx, 1, useQ, seen);
    } finally {
      c._undoMove();
    }
    scored.push({ move: m, score });
    if (score > alpha) alpha = score;
  }
  return scored;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Box–Muller: normal noise with the given spread, in centipawns.
function gaussian(spread) {
  const u = 1 - Math.random(), v = Math.random();
  return spread * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pickFast(c, level, seen) {
  const cfg = LEVEL[level] || LEVEL.medium;
  const legalRoot = c._moves({ legal: true });
  if (legalRoot.length === 0) return null;
  if (legalRoot.length === 1) return legalRoot[0];

  if (cfg.blunder && Math.random() < cfg.blunder) {
    return legalRoot[Math.floor(Math.random() * legalRoot.length)];
  }

  const ctx = makeContext(now() + cfg.timeMs);
  const exact = cfg.noise > 0;
  let best = null;
  let bestScored = null;
  // Shuffle first so equal scores don't always resolve to the same move.
  let rootMoves = orderMoves(shuffle(legalRoot.slice()));
  for (let depth = 1; depth <= cfg.depth; depth++) {
    let scored;
    try {
      scored = scoreRoot(c, rootMoves, depth, ctx, cfg.quiesce, seen, exact);
    } catch (e) {
      if (e === TIMEOUT) break;
      throw e;
    }
    scored.sort((a, b) => b.score - a.score);
    bestScored = scored;
    best = scored[0].move;
    if (scored[0].score >= MATE - 100) break; // found a forced mate
    rootMoves = orderMoves(rootMoves, best);
  }
  if (!bestScored) return best || legalRoot[0];

  if (cfg.noise > 0) {
    // Never throw away a mate (for or against) with noise.
    const top = bestScored[0].score;
    if (Math.abs(top) < MATE - 1000) {
      let pick = bestScored[0], pickScore = -INF;
      for (const s of bestScored) {
        const noisy = s.score + gaussian(cfg.noise);
        if (noisy > pickScore) { pickScore = noisy; pick = s; }
      }
      return pick.move;
    }
  }
  return best;
}

// Public-API fallback: one move of lookahead with material only.
function pickSlow(c, level) {
  const cfg = LEVEL[level] || LEVEL.medium;
  const moves = c.moves({ verbose: true });
  if (moves.length === 0) return null;
  if (cfg.blunder && Math.random() < cfg.blunder) {
    const m = moves[Math.floor(Math.random() * moves.length)];
    return { from: m.from, to: m.to, promotion: m.promotion };
  }
  let best = moves[0], bestScore = -INF;
  for (const m of moves) {
    c.move(m);
    let score = c.isCheckmate() ? MATE : 0;
    for (const row of c.board()) for (const p of row) if (p) score += (p.color === m.color ? 1 : -1) * VALUE[p.type];
    c.undo();
    score += gaussian(Math.max(cfg.noise, 10));
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return { from: best.from, to: best.to, promotion: best.promotion };
}

// history: the game's moves from the standard start position, as
// [{ from, to, promotion }]. Returns the bot's reply in the same shape, or
// null when the game is already over.
export function pickMove(history, level) {
  const c = new Chess();
  const seen = new Set();
  const fast = hasInternals(c);
  if (fast && c._hash !== undefined) seen.add(c._hash);
  for (const m of history) {
    c.move({ from: m.from, to: m.to, promotion: m.promotion || undefined });
    if (fast && c._hash !== undefined) seen.add(c._hash);
  }
  if (c.isGameOver()) return null;
  if (!fast) return pickSlow(c, level);
  const m = pickFast(c, level, seen);
  if (!m) return null;
  return { from: algebraic(m.from), to: algebraic(m.to), promotion: m.promotion || undefined };
}
