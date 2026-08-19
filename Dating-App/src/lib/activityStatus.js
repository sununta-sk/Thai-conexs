// src/lib/activityStatus.js
//
// Single source of truth for the "online" / "recently active" definition,
// used by OnlineContext (bulk computation for the Discover grid + navbar
// counter) and by any page that already has a specific profile's
// last_seen_at loaded (RoomChat sidebar, UserProfilePage).
//
// Tiers for REAL users are honest — never randomized or fabricated:
//   'online'          - a live presence-channel connection, or activity
//                        within the last ONLINE_THRESHOLD_MS.
//   'recently_active' - not online, but activity within the last
//                        RECENTLY_ACTIVE_THRESHOLD_MS.
//   'offline'         - neither.
//
// Bots are a separate case (see isBotOnlineNow below): their last_seen_at
// gets refreshed on its own cadence outside this app, which used to make
// them unconditionally 'online' all the time. They now rotate through a
// staggered on/off cycle instead, independent of that timestamp.

export const ONLINE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
export const RECENTLY_ACTIVE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

// Bots rotate on/off in a deterministic, staggered cycle instead of being
// permanently online, so the top of Discover doesn't read as 9 accounts
// stuck green forever. Deterministic (a pure function of botId + wall-clock
// time, not Math.random()) so every viewer sees the same bots online at the
// same moment, and each bot gets its own phase offset (hashed from its id)
// so they don't all flip on/off in lockstep - at any moment roughly
// BOT_ONLINE_FRACTION of the 9 are online, and which ones changes as the
// cycle rotates.
const BOT_ROTATION_CYCLE_MS = 6 * 60 * 1000; // 6-minute rotation
const BOT_ONLINE_FRACTION = 0.4; // ~4 of 9 bots online at any given moment

function hashId(id) {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * @param {string|null} botId
 * @param {number} [now] - injectable for testing
 * @returns {boolean}
 */
export function isBotOnlineNow(botId, now = Date.now()) {
  if (!botId) return true; // no id to hash - fall back to the old always-online behavior
  const offset = hashId(botId) % BOT_ROTATION_CYCLE_MS;
  const phase = (now + offset) % BOT_ROTATION_CYCLE_MS;
  return phase < BOT_ROTATION_CYCLE_MS * BOT_ONLINE_FRACTION;
}

/**
 * @param {{ isBot?: boolean, botId?: string|null, isPresent?: boolean, lastSeenAt?: string|null }} params
 * @returns {'online'|'recently_active'|'offline'}
 */
export function getActivityTier({ isBot = false, botId = null, isPresent = false, lastSeenAt = null } = {}) {
  if (isBot) return isBotOnlineNow(botId) ? 'online' : 'offline';
  if (isPresent) return 'online';
  if (!lastSeenAt) return 'offline';
  const age = Date.now() - new Date(lastSeenAt).getTime();
  if (age <= ONLINE_THRESHOLD_MS) return 'online';
  if (age <= RECENTLY_ACTIVE_THRESHOLD_MS) return 'recently_active';
  return 'offline';
}
