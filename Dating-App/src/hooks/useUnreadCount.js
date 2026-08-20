// src/hooks/useUnreadCount.js
// Returns total count of unread messages addressed to current user.
// Live-updates via realtime subscription + a 60s polling safety net.
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useUnreadCount() {
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') setUserId(null);
      else if (s) setUserId(s.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) { setCount(0); return; }

    let cancelled = false;
    let inFlight = false; // guard against overlapping fetches piling up if a query is slow
    const fetchCount = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const { count: c, error } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false)
          .neq('sender_id', userId)
          .like('chat_id', `%${userId}%`);
        if (!cancelled && !error) setCount(c || 0);
      } finally {
        inFlight = false;
      }
    };

    fetchCount();

    // The realtime subscription had no filter at all — it re-fetched on
    // EVERY message change anywhere in the app, for every user, regardless
    // of whether that message involved them. On a live site with real chat
    // traffic this scales with total site-wide message volume, not with
    // anything relevant to this user, and can produce a very high, unbounded
    // firing rate. Postgres realtime filters can't express "chat_id contains
    // my id" server-side (same chat_id-encoding limitation noted for the
    // .like() query above), so filter client-side instead — same pattern
    // GlobalToast.jsx already uses for its own per-user message listener.
    const involvesMe = (row) => row?.chat_id?.includes(userId);
    const sub = supabase
      .channel(`unread-counter-${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (involvesMe(payload.new) || involvesMe(payload.old)) fetchCount();
        })
      .subscribe();

    // Safety-net fallback only, not the primary update mechanism - the
    // realtime subscription above (with its client-side filter) is what
    // actually drives updates. This was 3s, running globally on every
    // authenticated page via Navbar/MobileNavbar, calling the same
    // known-expensive LIKE '%uid%' query as the realtime handler on every
    // single tick regardless of whether anything changed. Widened to 60s so
    // it still self-corrects if a realtime event is ever missed (tab
    // backgrounded, brief disconnect), without polling ~20x more often than
    // a fallback needs to. Deliberately not removed - see perf audit's
    // Area 1 for why this exists (intentional belt-and-suspenders design,
    // not a leftover) - and NOT touching the underlying query itself, which
    // is the separately-flagged, out-of-scope schema issue.
    const interval = setInterval(fetchCount, 60000);

    return () => {
      cancelled = true;
      supabase.removeChannel(sub);
      clearInterval(interval);
    };
  }, [userId]);

  return count;
}
