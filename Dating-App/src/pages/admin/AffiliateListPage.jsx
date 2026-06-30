// src/pages/admin/AffiliateListPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabaseClient'

const STATUS_TABS = ['all', 'approved', 'inactive']

export default function AffiliateListPage() {
  const navigate = useNavigate()

  const [affiliates, setAffiliates]     = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats]               = useState({ total: 0, approved: 0, inactive: 0 })
  const [detailModal, setDetailModal]   = useState(null)
  const [confirming, setConfirming]     = useState(false)

  useEffect(() => { fetchAffiliates() }, [statusFilter])

  async function fetchAffiliates() {
    setLoading(true)
    let q = supabase
      .from('affiliates')
      .select('id, contact_name, contact_email, contact_phone, referral_code, commission_rate, status, created_at, payout_method, payout_details, notes')
      .order('created_at', { ascending: false })
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const { data } = await q
    setAffiliates(data || [])

    const [all, approved, inactive] = await Promise.all([
      supabase.from('affiliates').select('id', { count: 'exact', head: true }),
      supabase.from('affiliates').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('affiliates').select('id', { count: 'exact', head: true }).eq('status', 'inactive'),
    ])
    setStats({ total: all.count || 0, approved: approved.count || 0, inactive: inactive.count || 0 })
    setLoading(false)
  }

  async function openDetail(a) {
    const { data: pays } = await supabase
      .from('affiliate_payouts')
      .select('id, total_amount, currency, payment_method, payment_detail, status, requested_at')
      .eq('affiliate_id', a.id)
      .order('requested_at', { ascending: false })
      .limit(5)
    setDetailModal({ ...a, payouts: pays || [] })
  }

  async function handleDelete(id, name) {
    if (!confirm(`Remove "${name}"?`)) return
    await supabase.from('affiliates').delete().eq('id', id)
    setAffiliates(prev => prev.filter(a => a.id !== id))
    setStats(prev => ({ ...prev, total: prev.total - 1 }))
  }

  // ── กดปุ่มนี้ = โอนเงินแล้ว — สร้าง payout record + paid ในทีเดียว ──
  async function handleConfirmPayout() {
    if (!detailModal) return

    const amt = prompt('Amount transferred (EUR):', '30')
    if (!amt) return

    setConfirming(true)

    // สร้าง payout record พร้อม status = paid ทันที
    const { data: newPay, error: payErr } = await supabase
      .from('affiliate_payouts')
      .insert({
        affiliate_id:   detailModal.id,
        total_amount:   parseFloat(amt),
        currency:       'EUR',
        payment_method: detailModal.payout_method || 'bank_transfer',
        status:         'paid',
        requested_at:   new Date().toISOString(),
        paid_at:        new Date().toISOString(),
      })
      .select('id')
      .single()

    if (payErr) {
      alert('Error: ' + payErr.message)
      setConfirming(false)
      return
    }

    // Audit log
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('admin_audit_log').insert({
        action_type: 'payout_approve',
        target_type: 'payout',
        target_id:   newPay?.id,
        metadata: {
          affiliate_name: detailModal.contact_name,
          amount:         parseFloat(amt),
          currency:       'EUR',
          payment_method: detailModal.payout_method || 'bank_transfer',
          note:           `Confirmed transfer of €${amt} to ${detailModal.contact_name}`,
        },
      })
    } catch (e) { console.error('audit log error', e) }

    setConfirming(false)
    alert(`✅ Saved — transferred €${amt} to ${detailModal.contact_name}`)
    setDetailModal(null)
    fetchAffiliates()
  }

  const filtered = affiliates.filter(a => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      a.contact_name?.toLowerCase().includes(q) ||
      a.contact_email?.toLowerCase().includes(q) ||
      a.contact_phone?.toLowerCase().includes(q) ||
      a.referral_code?.toLowerCase().includes(q)
    )
  })

  return (
    <AdminLayout>
      <div style={S.page}>

        {/* Header */}
        <div style={S.header}>
          <div>
            <h1 style={S.title}>🤝 Affiliates</h1>
            <p style={S.subtitle}>Manage affiliates and referral data</p>
          </div>
          <button onClick={() => navigate('/admin/payouts/new')} style={S.btnPink}>
            + New Payout Request
          </button>
        </div>

        {/* Stats */}
        <div style={S.statsGrid}>
          {[
            { label: 'Total Affiliates', value: stats.total,    color: '#60a5fa', bg: '#3b82f611' },
            { label: 'Approved',         value: stats.approved, color: '#10b981', bg: '#10b98111' },
            { label: 'Inactive',         value: stats.inactive, color: '#f87171', bg: '#ef444411' },
          ].map(s => (
            <div key={s.label} style={{ ...S.statCard, background: s.bg, border: `1px solid ${s.color}33` }}>
              <div style={{ ...S.statVal, color: s.color }}>{s.value}</div>
              <div style={S.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={S.toolbar}>
          <div style={S.tabs}>
            {STATUS_TABS.map(tab => (
              <button key={tab} onClick={() => setStatusFilter(tab)}
                style={{ ...S.tab, ...(statusFilter === tab ? S.tabActive : {}) }}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <input
            placeholder="Search name, email, phone, code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={S.searchInput}
          />
        </div>

        {/* Table */}
        <div style={S.tableWrap}>
          {loading ? (
            <div style={S.empty}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={S.empty}>No affiliates found</div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr style={S.theadRow}>
                  {['Affiliate', 'Phone', 'Referral Code', 'Commission', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} style={S.tr}>
                    <td style={S.td}>
                      <div style={S.affiliateCell}>
                        <div style={S.avatar}>{(a.contact_name || 'A')[0].toUpperCase()}</div>
                        <div>
                          <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>{a.contact_name || '—'}</div>
                          <div style={{ color: '#475569', fontSize: 12 }}>{a.contact_email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={S.td}><span style={{ color: '#94a3b8', fontSize: 13 }}>{a.contact_phone || '—'}</span></td>
                    <td style={S.td}><span style={{ color: '#e91e63', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{a.referral_code}</span></td>
                    <td style={S.td}><span style={{ color: '#f1f5f9', fontWeight: 600 }}>{a.commission_rate || 20}%</span></td>
                    <td style={S.td}><span style={{ ...S.statusPill, ...statusStyle(a.status) }}>{a.status}</span></td>
                    <td style={S.td}><span style={{ color: '#475569', fontSize: 12 }}>{new Date(a.created_at).toLocaleDateString('en-GB')}</span></td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openDetail(a)} style={S.btnDetail}>📄 Details</button>
                        <button onClick={() => navigate(`/admin/payouts/new?affiliate_id=${a.id}`)} style={S.btnPayout}>💸</button>
                        <button onClick={() => handleDelete(a.id, a.contact_name)} style={S.btnDelete}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* ── Detail Modal ── */}
      {detailModal && (
        <div style={S.overlay} onClick={() => setDetailModal(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <button style={S.closeBtn} onClick={() => setDetailModal(null)}>✕</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ ...S.avatar, width: 52, height: 52, fontSize: 20 }}>
                {(detailModal.contact_name || 'A')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 18 }}>{detailModal.contact_name || '—'}</div>
                <div style={{ color: '#475569', fontSize: 12 }}>{detailModal.referral_code}</div>
              </div>
            </div>

            <div style={S.section}>
              <div style={S.sectionTitle}>📋 Contact Info</div>
              <Row label="Full Name"  value={detailModal.contact_name  || '—'} />
              <Row label="Phone"       value={detailModal.contact_phone || '—'} highlight />
              <Row label="Email"          value={detailModal.contact_email || '—'} />
            </div>

            <div style={S.section}>
              <div style={S.sectionTitle}>🏦 Payment Info</div>
              <Row label="Method"         value={detailModal.payout_method  || '—'} />
              <Row label="Aails" value={detailModal.payout_details || '—'} highlight />
              <Row label="Commission"      value={`${detailModal.commission_rate || 20}%`} />
            </div>

            {detailModal.payouts?.length > 0 && (
              <div style={S.section}>
                <div style={S.sectionTitle}>💸 Recent Payouts</div>
                {detailModal.payouts.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e293b', fontSize: 13 }}>
                    <div>
                      <span style={{ color: '#f1f5f9', fontWeight: 700 }}>€{(p.total_amount || 0).toFixed(2)}</span>
                      <span style={{ color: '#475569', marginLeft: 8 }}>{p.payment_method}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ ...S.statusPill, ...payoutStatusStyle(p.status), fontSize: 11 }}>{p.status}</span>
                      <span style={{ color: '#475569', fontSize: 11 }}>{p.requested_at ? new Date(p.requested_at).toLocaleDateString('en-GB') : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detailModal.notes && (
              <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 14px', color: '#94a3b8', fontSize: 13, marginTop: 8 }}>
                📝 {detailModal.notes}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => { setDetailModal(null); navigate(`/admin/affiliates/${detailModal.id}`) }}
                style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                View Full Details
              </button>
              <button
                onClick={handleConfirmPayout}
                disabled={confirming}
                style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14, opacity: confirming ? 0.6 : 1 }}>
                {confirming ? '⏳ Saving...' : '✅ Transfer confirmed'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  )
}

function Row({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e293b' }}>
      <span style={{ color: '#64748b', fontSize: 13 }}>{label}</span>
      <span style={{ color: highlight ? '#f1f5f9' : '#94a3b8', fontSize: 13, fontWeight: highlight ? 700 : 400, maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>
        {value}
      </span>
    </div>
  )
}

function statusStyle(s) {
  return ({
    approved: { background: '#10b98122', color: '#10b981', border: '1px solid #10b98144' },
    inactive: { background: '#ef444422', color: '#f87171', border: '1px solid #ef444444' },
    pending:  { background: '#f59e0b22', color: '#fbbf24', border: '1px solid #f59e0b44' },
  })[s] || { background: '#33415522', color: '#94a3b8', border: '1px solid #33415544' }
}

function payoutStatusStyle(s) {
  return ({
    pending:  { background: '#f59e0b22', color: '#fbbf24' },
    approved: { background: '#3b82f622', color: '#60a5fa' },
    paid:     { background: '#10b98122', color: '#10b981' },
    rejected: { background: '#ef444422', color: '#f87171' },
  })[s] || { background: '#33415522', color: '#94a3b8' }
}

const S = {
  page:        { padding: 24, maxWidth: 1200, margin: '0 auto', color: '#f1f5f9' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title:       { margin: '0 0 4px', fontSize: 24, fontWeight: 800 },
  subtitle:    { margin: 0, color: '#64748b', fontSize: 14 },
  btnPink:     { background: '#e91e63', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' },
  statsGrid:   { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  statCard:    { borderRadius: 12, padding: '20px 24px' },
  statVal:     { fontSize: 32, fontWeight: 800, marginBottom: 4 },
  statLabel:   { fontSize: 13, color: '#94a3b8' },
  toolbar:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16 },
  tabs:        { display: 'flex', gap: 4, background: '#0f172a', borderRadius: 8, padding: 4 },
  tab:         { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600 },
  tabActive:   { background: '#1e293b', color: '#f1f5f9' },
  searchInput: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '9px 14px', color: '#f1f5f9', fontSize: 14, width: 280, outline: 'none' },
  tableWrap:   { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  theadRow:    { background: '#0f172a' },
  th:          { padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #334155', fontWeight: 600 },
  tr:          { borderBottom: '1px solid #0f172a' },
  td:          { padding: '14px 16px', fontSize: 14, verticalAlign: 'middle' },
  affiliateCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar:      { width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #e91e63, #9c27b0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0 },
  statusPill:  { borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600, display: 'inline-block' },
  btnDetail:   { background: '#334155', color: '#f1f5f9', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
  btnPayout:   { background: '#e91e6322', color: '#e91e63', border: '1px solid #e91e6344', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 13 },
  btnDelete:   { background: '#ef444422', color: '#f87171', border: '1px solid #ef444444', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 13 },
  empty:       { padding: 60, textAlign: 'center', color: '#475569', fontSize: 14 },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal:       { background: '#1e293b', border: '1px solid #334155', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28, position: 'relative', maxHeight: '90vh', overflowY: 'auto' },
  closeBtn:    { position: 'absolute', top: 14, right: 14, background: '#334155', border: 'none', color: '#94a3b8', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 13 },
  section:     { marginBottom: 16 },
  sectionTitle:{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #334155' },
}