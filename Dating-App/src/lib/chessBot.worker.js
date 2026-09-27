// src/lib/chessBot.worker.js — runs the bot's search (chessEngine.js) off the
// main thread so the board stays responsive while the bot thinks.
import { pickMove } from "./chessEngine";

self.onmessage = (e) => {
  const { id, history, level } = e.data || {};
  try {
    self.postMessage({ id, move: pickMove(history || [], level) });
  } catch (err) {
    self.postMessage({ id, error: String(err?.message || err) });
  }
};
