// src/hooks/useAuditLogger.js
import { useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAuditLogger() {
  const DEDUP_MS = 500
  const inFlight = useRef(new Map())

  const logAction = useCallback(async (payload) => {
    // Dedup key
    const dedupKey = [
      payload.action_type,
      payload.target_type,
      payload.target_id || (payload.target_ids || []).join(','),
    ].join('|')

    const now = Date.now()
    const cached = inFlight.current.get(dedupKey)
    if (cached && now - cached.at < DEDUP_MS) return cached.promise

    const promise = (async () => {
      const { data } = await supabase.auth.getSession()
      const session = data?.session

      if (!session?.access_token) {
        throw new Error('[useAuditLogger] No active session')
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-audit-log`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(`[useAuditLogger] ${err.error || `HTTP ${response.status}`}`)
      }

      return response.json()
    })()

    inFlight.current.set(dedupKey, { promise, at: now })
    promise.finally(() => {
      const entry = inFlight.current.get(dedupKey)
      if (entry?.promise === promise) inFlight.current.delete(dedupKey)
    })

    return promise
  }, [])

  return { logAction }
}