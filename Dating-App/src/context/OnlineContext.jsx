// src/contexts/OnlineContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const OnlineContext = createContext({
  onlineUsers: new Set(),
  onlineCount: 0,
  botIds: new Set(),
});

export function OnlineProvider({ children }) {
  const [realOnlineUsers, setRealOnlineUsers] = useState(new Set());
  const [botIds, setBotIds] = useState(new Set());
  const [currentUserId, setCurrentUserId] = useState(null);

  // 1. Load bot IDs once on mount
  useEffect(() => {
    let mounted = true;
    supabase
      .from('profiles')
      .select('id')
      .eq('is_bot', true)
      .then(({ data, error }) => {
        if (error) {
          console.warn('[OnlineContext] Failed to load bot IDs:', error.message);
          return;
        }
        if (mounted && data) {
          setBotIds(new Set(data.map((r) => r.id)));
        }
      });
    return () => { mounted = false; };
  }, []);

  // 2. Track current user id (for presence key)
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

  // 3. Subscribe presence channel for real users
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

  // 4. Combine: bots are always online + real users from presence
  const onlineUsers = new Set([...botIds, ...realOnlineUsers]);

  return (
    <OnlineContext.Provider value={{
      onlineUsers,
      onlineCount: onlineUsers.size,
      botIds,
    }}>
      {children}
    </OnlineContext.Provider>
  );
}

export function useOnline() {
  return useContext(OnlineContext);
}