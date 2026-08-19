// src/contexts/OnlineContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getActivityTier } from '../lib/activityStatus';

// How often we re-fetch last_seen_at for everyone, and re-derive the
// online/recently-active sets so users age out of a window over time even
// without new data arriving.
const POLL_INTERVAL_MS = 60 * 1000;

// How often the current user's own last_seen_at gets written while the app
// is open - anywhere, not just Discover. Comfortably inside
// ONLINE_THRESHOLD_MS (15 min) so "Sort by Last Active" reflects someone
// who's actively using the app (chatting, browsing profiles, etc.) within a
// couple of minutes, without writing on every render.
const HEARTBEAT_INTERVAL_MS = 90 * 1000;

const OnlineContext = createContext({
  onlineUsers: new Set(),
  recentlyActiveUsers: new Set(),
  onlineCount: 0,
  botIds: new Set(),
  getTier: () => 'offline',
  touchActivity: () => {},
});

export function OnlineProvider({ children }) {
  const [realOnlineUsers, setRealOnlineUsers] = useState(new Set());
  const [botIds, setBotIds] = useState(new Set());
  const [lastSeenMap, setLastSeenMap] = useState(new Map()); // id -> last_seen_at
  const [currentUserId, setCurrentUserId] = useState(null);
  const [tick, setTick] = useState(0); // forces a re-derive between polls

  // 1. Load bot IDs + last_seen_at for every profile, then keep it fresh.
  // This is the one shared source of truth: everywhere "online" or
  // "recently active" is shown or filtered on reads from this data via
  // getActivityTier, instead of each page computing its own threshold.
  useEffect(() => {
    let mounted = true;
    async function loadActivity() {
      const { data, error } = await supabase.from('profiles').select('id, is_bot, last_seen_at');
      if (error) {
        console.warn('[OnlineContext] Failed to load profile activity:', error.message);
        return;
      }
      if (!mounted || !data) return;
      setBotIds(new Set(data.filter((r) => r.is_bot).map((r) => r.id)));
      setLastSeenMap(new Map(data.map((r) => [r.id, r.last_seen_at])));
    }
    loadActivity();
    const interval = setInterval(loadActivity, POLL_INTERVAL_MS);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // 2. Re-derive tiers periodically even when no new data has arrived, so a
  // user who goes quiet still ages out of "online" (15m) and "recently
  // active" (2h) on time rather than only on the next poll response.
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. Track current user id (for presence key)
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setCurrentUserId(session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setCurrentUserId(session?.user?.id ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // 4. Subscribe presence channel for real users (live "connected right now"
  // signal — always counts as online regardless of last_seen_at).
  useEffect(() => {
    if (!currentUserId) { setRealOnlineUsers(new Set()); return; }

    const channel = supabase.channel('global-presence', {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        setRealOnlineUsers(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  // touchActivity: writes the current user's own last_seen_at "now". Kept
  // as a stable callback so pages can call it directly at a specific
  // activity moment (opening a chat, sending a message) instead of waiting
  // for the interval below. Throttled to at most once every 20s so a burst
  // of calls (e.g. several messages in quick succession) doesn't turn into
  // a write per message.
  const lastHeartbeatRef = useRef(0);
  const touchActivity = useCallback(() => {
    if (!currentUserId) return;
    const now = Date.now();
    if (now - lastHeartbeatRef.current < 20 * 1000) return;
    lastHeartbeatRef.current = now;
    supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', currentUserId)
      .then(({ error }) => { if (error) console.warn('[OnlineContext] heartbeat write failed:', error.message); });
  }, [currentUserId]);

  // 5b. Recurring heartbeat: keeps last_seen_at close to real-time while the
  // user is active ANYWHERE in the app (this provider wraps the whole app,
  // not just Discover). Skips the write while the tab is hidden/backgrounded
  // to avoid piling up needless DB writes for an idle background tab.
  useEffect(() => {
    if (!currentUserId) return;
    touchActivity(); // write immediately on login/app-open, don't wait a full interval
    const interval = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      touchActivity();
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [currentUserId, touchActivity]);

  // 5. Derive the single online / recently-active sets from presence + bots
  // + last_seen_at, all via the shared getActivityTier definition.
  const { onlineUsers, recentlyActiveUsers } = useMemo(() => {
    const online = new Set();
    const recentlyActive = new Set();
    const allIds = new Set([...botIds, ...realOnlineUsers, ...lastSeenMap.keys()]);
    for (const id of allIds) {
      const tier = getActivityTier({
        isBot: botIds.has(id),
        isPresent: realOnlineUsers.has(id),
        lastSeenAt: lastSeenMap.get(id) ?? null,
      });
      if (tier === 'online') online.add(id);
      else if (tier === 'recently_active') recentlyActive.add(id);
    }
    return { onlineUsers: online, recentlyActiveUsers: recentlyActive };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botIds, realOnlineUsers, lastSeenMap, tick]);

  // Per-user tier lookup for pages that already have a fresher last_seen_at
  // for one specific profile (e.g. just fetched it) than our polled map —
  // still reuses presence + bot state from this same context.
  const getTier = useCallback((id, lastSeenAt) => getActivityTier({
    isBot: botIds.has(id),
    isPresent: realOnlineUsers.has(id),
    lastSeenAt: lastSeenAt ?? lastSeenMap.get(id) ?? null,
  }), [botIds, realOnlineUsers, lastSeenMap]);

  return (
    <OnlineContext.Provider value={{
      onlineUsers,
      recentlyActiveUsers,
      onlineCount: onlineUsers.size,
      botIds,
      getTier,
      touchActivity,
    }}>
      {children}
    </OnlineContext.Provider>
  );
}

export function useOnline() {
  return useContext(OnlineContext);
}
