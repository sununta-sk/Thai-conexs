// src/hooks/useIncognito.js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useIncognito() {
  const { user } = useAuth()
  const [incognito, setIncognito]   = useState(false)
  const [expiresAt, setExpiresAt]   = useState(null)
  const [duration, setDuration]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [toggling, setToggling]     = useState(false)
  const [timeLeft, setTimeLeft]     = useState(null)

  // โหลดสถานะ incognito จาก profiles
  const fetchStatus = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('incognito_enabled, incognito_expires_at, incognito_duration')
      .eq('id', user.id)
      .single()

    if (data) {
      const active =
        data.incognito_enabled &&
        (!data.incognito_expires_at || new Date(data.incognito_expires_at) > new Date())

      setIncognito(active)
      setExpiresAt(data.incognito_expires_at ? new Date(data.incognito_expires_at) : null)
      setDuration(data.incognito_duration)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  // countdown timer
  useEffect(() => {
    if (!expiresAt) { setTimeLeft(null); return }

    const tick = () => {
      const diff = expiresAt - new Date()
      if (diff <= 0) {
        setIncognito(false)
        setTimeLeft(null)
        setExpiresAt(null)
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(
        h > 0
          ? `${h}ช. ${m}น. ${s}ว.`
          : m > 0
          ? `${m}น. ${s}ว.`
          : `${s}ว.`
      )
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  // เปิด/ปิด incognito ผ่าน RPC
  const toggle = useCallback(async (selectedDuration) => {
    setToggling(true)
    try {
      const { data, error } = await supabase.rpc('toggle_incognito', {
        p_duration: selectedDuration,
      })
      if (error) throw error
      if (!data.success) throw new Error(data.error)

      setIncognito(data.incognito)
      setExpiresAt(data.expires_at ? new Date(data.expires_at) : null)
      setDuration(data.duration ?? null)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      setToggling(false)
    }
  }, [])

  return { incognito, expiresAt, duration, timeLeft, loading, toggling, toggle, refetch: fetchStatus }
}