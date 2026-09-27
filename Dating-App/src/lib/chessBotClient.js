// src/lib/chessBotClient.js — asks the bot for a move. Uses a Web Worker
// (chessBot.worker.js) so a 1–2s search never freezes the page; if the
// worker can't start (very old WebView, blocked worker), the same engine
// runs on the main thread instead, so the game still works.

export function createBotClient() {
  let worker = null;
  let broken = typeof Worker === "undefined";
  let seq = 0;
  const pending = new Map(); // id -> { resolve, reject, history, level }

  const onMain = (history, level) =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        import("./chessEngine").then(({ pickMove }) => resolve(pickMove(history, level)), reject);
      }, 30);
    });

  const giveUpOnWorker = () => {
    broken = true;
    try { worker?.terminate(); } catch { /* already gone */ }
    worker = null;
    const waiting = [...pending.values()];
    pending.clear();
    for (const p of waiting) onMain(p.history, p.level).then(p.resolve, p.reject);
  };

  const ensureWorker = () => {
    if (worker || broken) return worker;
    try {
      worker = new Worker(new URL("./chessBot.worker.js", import.meta.url), { type: "module" });
      worker.onmessage = (e) => {
        const { id, move, error } = e.data || {};
        const p = pending.get(id);
        if (!p) return;
        pending.delete(id);
        if (error) p.reject(new Error(error));
        else p.resolve(move);
      };
      worker.onerror = (e) => {
        e.preventDefault?.();
        console.warn("[ChessBot] worker failed, thinking on the main thread instead:", e.message);
        giveUpOnWorker();
      };
    } catch (err) {
      console.warn("[ChessBot] couldn't start worker:", err);
      broken = true;
      worker = null;
    }
    return worker;
  };

  return {
    // history: [{ from, to, promotion }] from the start position.
    // Resolves to { from, to, promotion } (or null if the game is over).
    pick(history, level) {
      const w = ensureWorker();
      if (!w) return onMain(history, level);
      return new Promise((resolve, reject) => {
        const id = ++seq;
        pending.set(id, { resolve, reject, history, level });
        w.postMessage({ id, history, level });
      });
    },
    dispose() {
      try { worker?.terminate(); } catch { /* already gone */ }
      worker = null;
      pending.clear();
    },
  };
}
