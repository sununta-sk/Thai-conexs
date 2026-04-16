// src/pages/admin/AuditLogPage.jsx
import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabaseClient'

export default function AuditLogPage() {
  const [logs, setLogs]     = useState([])
  const [loading, setLoad]  = useState(true)
  const [filter, setFilter] = useState('')
  const [page, setPage]     = useState(0)
  const PAGE_SIZE = 50

  useEffect(() => { fetchLogs() }, [page])

  async function fetchLogs() {
    setLoad(true)
    try {
      const { data } = await supabase
        .from('admin_audit_log')
        .select('*, admin_users(display_name)')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      setLogs(data || [])
    } catch(e) { console.error(e) }
    setLoad(false)
  }

  const ACTION_COLOR = {
    payout_approve:         '#10b981',
    payout_deny:            '#ef4444',
    user_ban:               '#ef4444',
    user_suspend:           '#f59e0b',
    user_restore:           '#10b981',
    photo_approve:          '#10b981',
    photo_reject:           '#ef4444',
    ticket_resolve:         '#3b82f6',
    plan_update:            '#8b5cf6',
    setting_update:         '#8b5cf6',
    announcement_publish:   '#3b82f6',
    affiliate_create:       '#10b981',
    commission_created:     '#10b981',
  }

  // ── แสดงข้อความอธิบายจาก metadata ──
  function getDescription(log) {
    const m = log.metadata || {}
    if (log.action_type === 'payout_approve') {
      return `โอนเงิน €${m.amount || '?'} ให้ ${m.affiliate_name || '?'} (${m.payment_method || ''})`
    }
    if (log.action_type === 'payout_deny') {
      return `ปฏิเสธ payout ของ ${m.affiliate_name || '?'} — ${m.review_notes || ''}`
    }
    if (m.note) return m.note
    if (m.affiliate_name) return m.affiliate_name
    return '—'
  }

  const filtered = filter
    ? logs.filter(l =>
        l.action_type?.includes(filter) ||
        l.target_type?.includes(filter) ||
        l.admin_users?.display_name?.toLowerCase().includes(filter.toLowerCase()) ||
        JSON.stringify(l.metadata || {}).toLowerCase().includes(filter.toLowerCase())
      )
    : logs

  return (
    <AdminLayout>
      <div style={S.page}>
        <div style={S.hdr}>
          <div>
            <h2 style={S.title}>📜 Audit Log</h2>
            <p style={S.sub}>All admin action history</p>
          </div>
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="🔍 Filter..."
            style={S.search}
          />
        </div>

        <div style={S.card}>
          {loading ? (
            <div style={S.empty}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={S.empty}>No audit log data</div>
          ) : (
            <>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Time', 'Admin', 'Action', 'Target', 'Details'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l, i) => {
                    const c = ACTION_COLOR[l.action_type] || '#64748b'
                    return (
                      <tr key={l.id ?? i} style={S.tr}>
                        {/* Time */}
                        <td style={{ ...S.td, fontSize: 11, whiteSpace: 'nowrap', color: '#475569' }}>
                          {l.created_at ? new Date(l.created_at).toLocaleString('en-GB') : '—'}
                        </td>

                        {/* Admin */}
                        <td style={S.td}>
                          <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>
                            {l.admin_users?.display_name ?? 'Admin'}
                          </div>
                        </td>

                        {/* Action */}
                        <td style={S.td}>
                          <span style={{ ...S.badge, background: `${c}22`, color: c }}>
                            {l.action_type ?? '—'}
                          </span>
                        </td>

                        {/* Target */}
                        <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12 }}>
                          <div style={{ color: '#94a3b8' }}>{l.target_type ?? '—'}</div>
                          {l.target_id && (
                            <div style={{ color: '#475569', fontSize: 10 }}>{String(l.target_id).slice(0, 8)}...</div>
                          )}
                        </td>

                        {/* Details */}
                        <td style={{ ...S.td, fontSize: 12, color: '#94a3b8', maxWidth: 300 }}>
                          {getDescription(l)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div style={S.pager}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={S.pageBtn}>← Prev</button>
                <span style={{ color: '#64748b', fontSize: 13 }}>Page {page + 1}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={logs.length < PAGE_SIZE} style={S.pageBtn}>Next →</button>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

const S = {
  page:    { padding: 24 },
  hdr:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16 },
  title:   { color: '#f1f5f9', fontSize: 22, fontWeight: 800, margin: '0 0 4px' },
  sub:     { color: '#64748b', fontSize: 13, margin: 0 },
  search:  { background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 16px', color: '#f1f5f9', fontSize: 13, width: 280, outline: 'none' },
  card:    { background: '#1e293b', borderRadius: 16, border: '1px solid #334155', overflow: 'hidden' },
  table:   { width: '100%', borderCollapse: 'collapse' },
  th:      { padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #334155', whiteSpace: 'nowrap' },
  tr:      { borderBottom: '1px solid #0f172a' },
  td:      { padding: '10px 16px', color: '#94a3b8', fontSize: 13, verticalAlign: 'middle' },
  badge:   { padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', display: 'inline-block' },
  pager:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16 },
  pageBtn: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 },
  empty:   { padding: 40, textAlign: 'center', color: '#475569' },
}