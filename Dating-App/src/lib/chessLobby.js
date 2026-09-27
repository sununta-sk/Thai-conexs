// src/lib/chessLobby.js — small helpers shared by the /chess lobby, the
// game page and the app-wide challenge popup (kept out of the .jsx files so
// react-refresh's only-export-components rule stays happy).

// profiles.avatar_url / photos[] hold either a plain URL string or an
// object with a `url` (same two shapes Navbar.jsx already handles).
export function avatarOf(profile) {
  if (!profile) return null;
  const pick = (v) => (typeof v === "string" ? v : v?.url || null);
  return pick(profile.avatar_url) || pick(profile.photos?.[0]) || null;
}

// Human-readable text for the lobby RPCs' {"error": code} answers
// (2026-09-27-chess-lobby-matchmaking.sql).
export function lobbyErrorText(tx, code, name) {
  const who = name || tx.opponent;
  if (code === "opponent_busy") return tx.errOpponentBusy(who);
  if (code === "opponent_unavailable") return tx.errUnavailable;
  if (code === "cooldown") return tx.errCooldown(who);
  if (code === "already_in_game") return tx.errAlreadyInGame;
  if (code === "challenge_expired" || code === "not_pending") return tx.errExpired;
  return tx.errGeneric;
}

// Two-note ascending chime for an incoming chess challenge — same notes as
// RoomChat.jsx's in-chat 'invite' sound, so both kinds of chess invite
// sound alike. Browsers only allow audio after the user has interacted with
// the page once; before that this silently does nothing.
let chimeCtx = null;
export function playChallengeChime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!chimeCtx) chimeCtx = new AC();
    if (chimeCtx.state === "suspended") chimeCtx.resume();
    const ctx = chimeCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(990, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio is a nice-to-have; never let it break the popup.
  }
}
