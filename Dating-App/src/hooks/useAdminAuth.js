// src/hooks/useAdminAuth.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAdminAuth() {
  const [adminUser, setAdminUser]     = useState(null);
  const [role, setRole]               = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [session, setSession]         = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async (currentSession) => {
      if (!currentSession) {
        if (mounted) { setAdminUser(null); setRole(null); setPermissions(null); setLoading(false); }
        return;
      }
      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('*, admin_roles(*)')
          .eq('auth_user_id', currentSession.user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (mounted) {
          if (error || !data) {
            setAdminUser(null); setRole(null); setPermissions(null);
          } else {
            setAdminUser(data);
            setRole(data.admin_roles);
            setPermissions(data.admin_roles?.permissions || {});
            await supabase.from('admin_users')
              .update({ last_login_at: new Date().toISOString() })
              .eq('id', data.id);
          }
          setLoading(false);
        }
      } catch {
        if (mounted) { setAdminUser(null); setLoading(false); }
      }
    };

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (mounted) setSession(s);
      load(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (mounted) { setSession(s); setLoading(true); load(s); }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const can = (module, action) => permissions?.[module]?.[action] === true;

  return { session, adminUser, role, permissions, loading, can };
}