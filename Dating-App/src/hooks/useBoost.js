// src/hooks/useBoost.js
// Phase 6A — Boost Profile
// Handles: fetch active boost, activate boost, countdown timer

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Returns boost state for the currently logged-in user.
 *
 * {
 *   boost          — active boost row | null
 *   timeLeft       — seconds remaining (live countdown) | null
 *   isActive       — boolean shorthand
 *   loading        — initial fetch in progress
 *   activating     — RPC call in progress
 *   error          — last error string | null
 *   activateBoost  — (durationHours: 1|6|24) => Promise<void>
 *   refresh        — () => void  force refetch
 * }
 */
export function useBoost(userId) {
  const [boost, setBoost]           = useState(null)
  const [timeLeft, setTimeLeft]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [activating, setActivating] = useState(false)
  const [error, setError]           = useState(null)

  // ── Fetch active boost ──────────────────────────────────
  const fetchBoost = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('profile_boosts')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (err) setError(err.message)
    else setBoost(data ?? null)

    setLoading(false)
  }, [userId])

  useEffect(() => { fetchBoost() }, [fetchBoost])

  // ── Live countdown ──────────────────────────────────────
  useEffect(() => {
    if (!boost) { setTimeLeft(null); return }

    const tick = () => {
      const secs = Math.max(
        0,
        Math.floor((new Date(boost.expires_at) - Date.now()) / 1000)
      )
      setTimeLeft(secs)
      if (secs === 0) {
        setBoost(null)
        setTimeLeft(null)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [boost])

  // ── Activate boost via RPC ──────────────────────────────
  const activateBoost = useCallback(async (durationHours) => {
    if (!userId) return
    setActivating(true)
    setError(null)

    const { data, error: err } = await supabase.rpc('activate_boost', {
      p_user_id:       userId,
      p_duration_hours: durationHours,
    })

    if (err) {
      setError(err.message)
      setActivating(false)
      return
    }

    if (data?.error) {
      const msg = {
        subscription_required: 'คุณต้องมี Subscription เพื่อใช้ Boost',
        boost_already_active:  'คุณมี Boost ที่ยังใช้งานอยู่',
      }[data.error] ?? data.error
      setError(msg)
      setActivating(false)
      return
    }

    await fetchBoost()
    setActivating(false)
  }, [userId, fetchBoost])

  return {
    boost,
    timeLeft,
    isActive:      !!boost,
    loading,
    activating,
    error,
    activateBoost,
    refresh: fetchBoost,
  }
}

// ── Utility: format seconds → "23:45:12" ───────────────────
export function formatCountdown(totalSeconds) {
  if (totalSeconds == null) return null
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0
    ? `${pad(h)}:${pad(m)}:${pad(s)}`
    : `${pad(m)}:${pad(s)}`
}