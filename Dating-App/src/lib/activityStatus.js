// src/lib/activityStatus.js
//
// Single source of truth for the "online" / "recently active" definition,
// used by OnlineContext (bulk computation for the Discover grid + navbar
// counter) and by any page that already has a specific profile's
// last_seen_at loaded (RoomChat sidebar, UserProfilePage).
//
// Tiers are honest — never randomized or fabricated:
//   'online'          - a live presence-channel connection, a bot (which are
//                        always considered online), or activity within the
//                        last ONLINE_THRESHOLD_MS.
//   'recently_active' - not online, but activity within the last
//                        RECENTLY_ACTIVE_THRESHOLD_MS.
//   'offline'         - neither.

export const ONLINE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
export const RECENTLY_ACTIVE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * @param {{ isBot?: boolean, isPresent?: boolean, lastSeenAt?: string|null }} params
 * @returns {'online'|'recently_active'|'offline'}
 */
export function getActivityTier({ isBot = false, isPresent = false, lastSeenAt = null } = {}) {
  if (isBot || isPresent) return 'online';
  if (!lastSeenAt) return 'offline';
  const age = Date.now() - new Date(lastSeenAt).getTime();
  if (age <= ONLINE_THRESHOLD_MS) return 'online';
  if (age <= RECENTLY_ACTIVE_THRESHOLD_MS) return 'recently_active';
  return 'offline';
}
