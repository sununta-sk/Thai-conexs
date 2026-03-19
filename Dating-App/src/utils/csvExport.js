/**
 * csvExport.js
 * CSV export utilities for Phase 8.
 * Used by UserListPage, SubscriptionListPage, AffiliateListPage, AuditLogPage.
 */

/** Download any array of objects as a CSV file */
export function exportCSV(data, filename = 'export.csv') {
    if (!data?.length) return
  
    const headers = Object.keys(data[0])
    const rows = data.map(row =>
      headers.map(h => {
        const val = row[h]
        if (val === null || val === undefined) return '""'
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
        return `"${str.replace(/"/g, '""')}"`
      }).join(',')
    )
  
    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
  
  /** Format a date for CSV filename: 2024-01-15 */
  export function csvDate() {
    return new Date().toISOString().slice(0, 10)
  }
  
  // ── Pre-built exporters per page ──────────────────────────────────────────────
  
  /** UserListPage export */
  export function exportUsers(users) {
    const rows = users.map(u => ({
      id:              u.id,
      email:           u.email,
      display_name:    u.display_name || '',
      country:         u.country || '',
      plan:            u.plan_name || 'free',
      is_banned:       u.is_banned ? 'Yes' : 'No',
      suspended_until: u.suspended_until || '',
      report_count:    u.report_count || 0,
      created_at:      u.created_at ? new Date(u.created_at).toLocaleString('th-TH') : '',
      last_sign_in:    u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('th-TH') : '',
    }))
    exportCSV(rows, `users_${csvDate()}.csv`)
  }
  
  /** SubscriptionListPage export */
  export function exportSubscriptions(subs) {
    const rows = subs.map(s => ({
      id:                        s.id,
      user_id:                   s.user_id,
      plan:                      s.subscription_plans?.name || '',
      status:                    s.status,
      billing_interval:          s.billing_interval,
      amount_paid:               s.amount_paid ?? '',
      currency:                  s.currency,
      payment_processor:         s.payment_processor || '',
      processor_subscription_id: s.processor_subscription_id || '',
      current_period_start:      s.current_period_start ? new Date(s.current_period_start).toLocaleString('th-TH') : '',
      current_period_end:        s.current_period_end ? new Date(s.current_period_end).toLocaleString('th-TH') : '',
      cancel_at_period_end:      s.cancel_at_period_end ? 'Yes' : 'No',
      cancelled_at:              s.cancelled_at ? new Date(s.cancelled_at).toLocaleString('th-TH') : '',
      created_at:                s.created_at ? new Date(s.created_at).toLocaleString('th-TH') : '',
    }))
    exportCSV(rows, `subscriptions_${csvDate()}.csv`)
  }
  
  /** AffiliateListPage commissions export */
  export function exportCommissions(commissions) {
    const rows = commissions.map(c => ({
      id:                c.id,
      affiliate_id:      c.affiliate_id,
      affiliate_name:    c.affiliates?.contact_name || '',
      gross_amount:      c.gross_amount,
      commission_rate:   `${(c.commission_rate * 100).toFixed(1)}%`,
      commission_amount: c.commission_amount,
      currency:          c.currency,
      status:            c.status,
      payout_id:         c.payout_id || '',
      created_at:        c.created_at ? new Date(c.created_at).toLocaleString('th-TH') : '',
    }))
    exportCSV(rows, `commissions_${csvDate()}.csv`)
  }
  
  /** AuditLogPage export */
  export function exportAuditLog(logs) {
    const rows = logs.map(l => ({
      id:          l.id,
      admin:       l.admin_users?.email || l.admin_user_id || '',
      action_type: l.action_type,
      target_type: l.target_type,
      target_id:   l.target_id || '',
      target_ids:  l.target_ids ? l.target_ids.join(';') : '',
      ip_address:  l.ip_address || '',
      created_at:  l.created_at ? new Date(l.created_at).toLocaleString('th-TH') : '',
      metadata:    l.metadata ? JSON.stringify(l.metadata) : '',
    }))
    exportCSV(rows, `audit_log_${csvDate()}.csv`)
  }