// src/hooks/useUnreadCount.js
// Returns total count of unread messages addressed to current user.
// Live-updates via realtime subscription + 3s polling backup.
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
    const fetchCount = async () => {
      const { count: c, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', userId)
        .like('chat_id', `%${userId}%`);
      if (!cancelled && !error) setCount(c || 0);
    };

    fetchCount();

    const sub = supabase
      .channel(`unread-counter-${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => fetchCount())
      .subscribe();

    const interval = setInterval(fetchCount, 3000);

    return () => {
      cancelled = true;
      supabase.removeChannel(sub);
      clearInterval(interval);
    };
  }, [userId]);

  return count;
}
