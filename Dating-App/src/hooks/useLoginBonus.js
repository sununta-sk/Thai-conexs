// src/hooks/useLoginBonus.js
// Grants the daily login lotus bonus (+1 per login, up to 2/day - see
// claim_daily_login_lotus, 2026-09-03-lotus-daily-login-grant.sql).
//
// Hooked to a single, app-lifetime onAuthStateChange('SIGNED_IN')
// listener rather than Login.jsx's own password-form success handler,
// since this app also supports Google OAuth (signInWithOAuth) - that flow
// resumes via redirect and never touches Login.jsx's handler again, so
// hooking only the password path would silently miss every OAuth login.
// Mounted once from the top-level App() component (alongside
// OnlineProvider, which is the one thing in this app confirmed to mount
// exactly once for the whole app's lifetime regardless of route) rather
// than ProtectedRoute, which remounts on every route navigation and could
// miss a same-tick sign-in race (sign-in happens on /login, which isn't
// wrapped in ProtectedRoute).
//
// Same one-hook-per-concern pattern this codebase already uses for
// useUnreadCount/useNotifications/useAdminAuth/useOnline, each with their
// own independent onAuthStateChange subscription, rather than piling
// unrelated concerns into one shared listener.
import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useLoginBonus() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        supabase.rpc('claim_daily_login_lotus', { p_user_id: session.user.id })
          .then(({ error }) => {
            if (error) console.error('[useLoginBonus] claim_daily_login_lotus failed:', error.message)
          })
      }
    })
    return () => subscription.unsubscribe()
  }, [])
}
