import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useRealtimeBadges
 * Realtime badge counts for AdminSidebar nav items.
 * Subscribes via supabase.channel() — re-fetches on any INSERT/UPDATE/DELETE.
 *
 * Tables watched:
 *   photo_moderation_queue  → status = 'pending'
 *   moderation_tickets      → status IN ('open','in_progress')
 *   content_reports         → status IN ('open','in_review')
 *   affiliate_payouts       → status = 'pending_approval'
 */
export function useRealtimeBadges() {
  const [badges, setBadges] = useState({
    photoPending: 0, openTickets: 0, openReports: 0, pendingPayouts: 0,
  })
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  const fetchCounts = useCallback(async () => {
    const [photos, tickets, reports, payouts] = await Promise.all([
      supabase.from('photo_moderation_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('moderation_tickets').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
      supabase.from('content_reports').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_review']),
      supabase.from('affiliate_payouts').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval'),
    ])
    setBadges({
      photoPending:   photos.count   ?? 0,
      openTickets:    tickets.count  ?? 0,
      openReports:    reports.count  ?? 0,
      pendingPayouts: payouts.count  ?? 0,
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCounts()

    channelRef.current = supabase
      .channel('admin-badge-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photo_moderation_queue' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moderation_tickets' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_reports' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_payouts' }, fetchCounts)
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchCounts])

  return { ...badges, loading, refetch: fetchCounts }
}