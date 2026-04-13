import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabaseClient'

const STATUS_TABS = ['all', 'pending', 'approved', 'paid', 'rejected']

export default function PayoutListPage() {
  const navigate = useNavigate()
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [acting, setActing] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [selected, setSelected] = useState(new Set())

  useEffect(() => { fetchPayouts() }, [statusFilter])

  async function fetchPayouts() {
    setLoading(true)
    let q = supabase
      .from('affiliate_payouts')
      .select('*, affiliate:affiliates(id, referral_code, contact_name, contact_email)')
      .order('created_at', { ascending: false })
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const { data } = await q
    setPayouts(data || [])
    setSelected(new Set())
    setLoading(false)
  }

  async function handleApprove(id) {
    setActing(id)
    await supabase.from('affiliate_payouts').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', id)
    await fetchPayouts()
    setActing(null)
  }

  async function handleMarkPaid(id) {
    setActing(id)
    await supabase.from('affiliate_payouts').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id)
    await fetchPayouts()
    setActing(null)
  }

  async function handleRejectConfirm() {
    if (!rejectModal) return
    setActing(rejectModal.id)
    await supabase.from('affiliate_payouts').update({ status: 'rejected', note: rejectNote, reviewed_at: new Date().toISOString() }).eq('id', rejectModal.id)
    setRejectModal(null)
    setRejectNote('')
    await fetchPayouts()
    setActing(null)
  }

  async function handleBulkApprove() {
    const ids = [...selected]
    setActing('bulk')
    await Promise.all(ids.map(id =>
      supabase.from('affiliate_payouts').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', id)
    ))
    await fetchPayouts()
    setActing(null)
  }

  const filtered = payouts.filter(p => {
    if (!search) return true
    const name = p.affiliate?.users?.name?.toLowerCase() || ''
    const email = p.affiliate?.users?.email?.toLowerCase() || ''
    const code = p.affiliate?.referral_code?.toLowerCase() || ''
    const q = search.toLowerCase()
    return name.includes(q) || email.includes(q) || code.includes(q)
  })

  const pendingCount = payouts.filter(p => p.status === 'pending').length
  const totalPendingAmt = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0)
  const totalApprovedAmt = payouts.filter(p => p.status === 'approved').reduce((s, p) => s + (p.amount || 0), 0)
  const totalPaidAmt = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0)

  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id))
  const selectedPending = [...selected].filter(id => payouts.find(p => p.id === id && p.status === 'pending'))

  return (
    <AdminLayout>
      <div style={S.page}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <h1 style={S.title}>Payout Management</h1>
            <p style={S.subtitle}>Review and process affiliate withdrawal requests</p>
          </div>
          <button onClick={() => navigate('/payouts/new')} style={S.btnPink}>
          </button>
        </div>

        {/* Summary Cards */}
        <div style={S.summaryGrid}>
          {[
            { label: 'Pending Review', value: `$${totalPendingAmt.toFixed(2)}`, count: `${pendingCount} requests`, color: '#fbbf24', bg: '#f59e0b11' },
            { label: 'Approved (Queued)', value: `$${totalApprovedAmt.toFixed(2)}`, count: 'ready to send', color: '#60a5fa', bg: '#3b82f611' },
            { label: 'Total Paid Out', value: `$${totalPaidAmt.toFixed(2)}`, count: `${payouts.filter(p => p.status === 'paid').length} processed`, color: '#4ade80', bg: '#16a34a11' },
          ].map(s => (
            <div key={s.label} style={{ ...S.summaryCard, background: s.bg, border: `1px solid ${s.color}33` }}>
              <div style={{ ...S.summaryVal, color: s.color }}>{s.value}</div>
              <div style={S.summaryLabel}>{s.label}</div>
              <div style={S.summaryCount}>{s.count}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={S.toolbar}>
          {/* Status Tabs */}
          <div style={S.statusTabs}>
            {STATUS_TABS.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ ...S.statusTab, ...(statusFilter === s ? S.statusTabActive : {}) }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
                {s === 'pending' && pendingCount > 0 && (
                  <span style={S.badge}>{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            placeholder="Search affiliate name, email, code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={S.searchInput}
          />
        </div>

        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div style={S.bulkBar}>
            <span style={{ color: '#94a3b8', fontSize: '14px' }}>{selected.size} selected</span>
            {selectedPending.length > 0 && (
              <button onClick={handleBulkApprove} disabled={acting === 'bulk'} style={S.bulkBtn}>
                {acting === 'bulk' ? 'Approving…' : `✓ Approve ${selectedPending.length} Pending`}
              </button>
            )}
            <button onClick={() => setSelected(new Set())} style={{ ...S.bulkBtn, background: '#334155', color: '#94a3b8' }}>
              Clear
            </button>
          </div>
        )}

        {/* Table */}
        <div style={S.tableWrap}>
          {loading ? (
            <div style={S.loadingMsg}>Loading payouts…</div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr style={S.theadRow}>
                  <th style={{ ...S.th, width: '40px' }}>
                    <input type="checkbox" checked={allSelected}
                      onChange={e => setSelected(e.target.checked ? new Set(filtered.map(p => p.id)) : new Set())}
                      style={S.checkbox} />
                  </th>
                  {['Affiliate', 'Amount', 'Method', 'Status', 'Requested', 'Actions'].map(h =>
                    <th key={h} style={S.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={S.emptyCell}>No payouts found</td></tr>
                )}
                {filtered.map(p => {
                  const user = p.affiliate?.users || {}
                  const isBusy = acting === p.id
                  return (
                    <tr key={p.id} style={{ ...S.tr, ...(selected.has(p.id) ? S.trSelected : {}) }}>
                      <td style={S.td}>
                        <input type="checkbox" checked={selected.has(p.id)}
                          onChange={e => {
                            const next = new Set(selected)
                            e.target.checked ? next.add(p.id) : next.delete(p.id)
                            setSelected(next)
                          }}
                          style={S.checkbox} />
                      </td>
                      <td style={S.td}>
                        <div style={S.affiliateCell}>
                          <div style={S.avatarCircle}>
                            {user.avatar_url
                              ? <img src={user.avatar_url} alt="" style={S.avatarImg} />
                              : <span style={S.avatarInit}>{(user.name || 'A')[0].toUpperCase()}</span>}
                          </div>
                          <div>
                            <div style={S.affiliateName}
                              onClick={() => navigate(`/affiliates/${p.affiliate?.id}`)}
                              onMouseEnter={e => e.currentTarget.style.color = '#e91e63'}
                              onMouseLeave={e => e.currentTarget.style.color = '#e2e8f0'}>
                              {user.name || '—'}
                            </div>
                            <div style={S.affiliateEmail}>{user.email}</div>
                            <div style={S.affiliateCode}>Code: {p.affiliate?.referral_code}</div>
                          </div>
                        </div>
                      </td>
                      <td style={S.td}>
                        <span style={S.amountText}>${(p.amount || 0).toFixed(2)}</span>
                      </td>
                      <td style={S.td}>
                        <span style={S.methodTag}>{p.payment_method || 'bank'}</span>
                        {p.payment_detail && <div style={S.payDetail}>{p.payment_detail}</div>}
                      </td>
                      <td style={S.td}>
                        <span style={{ ...S.statusPill, ...statusStyle(p.status) }}>{p.status}</span>
                        {p.note && <div style={S.noteText}>Note: {p.note}</div>}
                      </td>
                      <td style={S.td}>
                        <div>{new Date(p.created_at).toLocaleDateString()}</div>
                        {p.paid_at && <div style={S.affiliateEmail}>Paid: {new Date(p.paid_at).toLocaleDateString()}</div>}
                      </td>
                      <td style={S.td}>
                        <div style={S.actionBtns}>
                          {p.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(p.id)} disabled={isBusy} style={S.btnApprove}>
                                {isBusy ? '…' : '✓ Approve'}
                              </button>
                              <button onClick={() => setRejectModal(p)} disabled={isBusy} style={S.btnReject}>
                                ✗ Reject
                              </button>
                            </>
                          )}
                          {p.status === 'approved' && (
                            <button onClick={() => handleMarkPaid(p.id)} disabled={isBusy} style={S.btnPaid}>
                              {isBusy ? '…' : '$ Mark Paid'}
                            </button>
                          )}
                          {(p.status === 'paid' || p.status === 'rejected') && (
                            <span style={{ color: '#475569', fontSize: '13px' }}>—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div style={S.modalOverlay} onClick={() => setRejectModal(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h3 style={S.modalTitle}>Reject Payout Request</h3>
            <p style={S.modalSub}>
              ${(rejectModal.amount || 0).toFixed(2)} from <strong>{rejectModal.affiliate?.users?.name}</strong>
            </p>
            <label style={S.modalLabel}>Rejection reason (shown to affiliate)</label>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="e.g. Bank details incorrect, please re-submit..."
              style={S.modalTextarea}
              rows={3}
            />
            <div style={S.modalFooter}>
              <button onClick={() => setRejectModal(null)} style={S.btnGhost}>Cancel</button>
              <button onClick={handleRejectConfirm} disabled={acting !== null} style={S.btnRejectConfirm}>
                {acting ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

function statusStyle(s) {
  return ({
    pending:  { background: '#f59e0b22', color: '#fbbf24', border: '1px solid #f59e0b44' },
    approved: { background: '#3b82f622', color: '#60a5fa', border: '1px solid #3b82f644' },
    paid:     { background: '#16a34a22', color: '#4ade80', border: '1px solid #16a34a44' },
    rejected: { background: '#ef444422', color: '#f87171', border: '1px solid #ef444444' },
  })[s] || { background: '#33415522', color: '#94a3b8', border: '1px solid #33415544' }
}

const S = {
  page: { padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#f1f5f9' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { margin: '0 0 4px', fontSize: '24px', fontWeight: 700 },
  subtitle: { margin: 0, color: '#64748b', fontSize: '14px' },
  btnPink: { background: '#e91e63', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' },
  summaryCard: { borderRadius: '12px', padding: '20px' },
  summaryVal: { fontSize: '28px', fontWeight: 700, display: 'block', marginBottom: '6px' },
  summaryLabel: { fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '2px' },
  summaryCount: { fontSize: '12px', color: '#475569' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px' },
  statusTabs: { display: 'flex', gap: '4px', background: '#0f172a', borderRadius: '8px', padding: '4px' },
  statusTab: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '7px 14px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' },
  statusTabActive: { background: '#1e293b', color: '#f1f5f9', fontWeight: 600 },
  badge: { background: '#e91e63', color: '#fff', borderRadius: '20px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 },
  searchInput: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '9px 14px', color: '#f1f5f9', fontSize: '14px', width: '280px', outline: 'none' },
  bulkBar: { display: 'flex', alignItems: 'center', gap: '10px', background: '#1e293b', border: '1px solid #e91e6333', borderRadius: '8px', padding: '10px 16px', marginBottom: '12px' },
  bulkBtn: { background: '#e91e6322', color: '#e91e63', border: '1px solid #e91e6344', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 },
  tableWrap: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' },
  loadingMsg: { padding: '60px', textAlign: 'center', color: '#475569' },
  table: { width: '100%', borderCollapse: 'collapse' },
  theadRow: { background: '#0f172a' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #334155', fontWeight: 600 },
  tr: { borderBottom: '1px solid #0f172a', transition: 'background 0.1s' },
  trSelected: { background: '#e91e630a' },
  td: { padding: '14px 16px', fontSize: '14px', verticalAlign: 'middle' },
  checkbox: { width: '15px', height: '15px', accentColor: '#e91e63', cursor: 'pointer' },
  affiliateCell: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatarCircle: { width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #334155' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInit: { fontSize: '14px', color: '#e91e63', fontWeight: 700 },
  affiliateName: { color: '#e2e8f0', fontWeight: 500, cursor: 'pointer', transition: 'color 0.15s' },
  affiliateEmail: { color: '#475569', fontSize: '12px', marginTop: '2px' },
  affiliateCode: { color: '#64748b', fontSize: '11px', marginTop: '1px' },
  amountText: { fontSize: '16px', fontWeight: 700, color: '#f1f5f9' },
  methodTag: { background: '#334155', color: '#94a3b8', borderRadius: '4px', padding: '2px 8px', fontSize: '12px' },
  payDetail: { color: '#475569', fontSize: '11px', marginTop: '4px' },
  statusPill: { borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-block' },
  noteText: { color: '#f87171', fontSize: '11px', marginTop: '4px' },
  actionBtns: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  btnApprove: { background: '#16a34a22', color: '#4ade80', border: '1px solid #16a34a44', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
  btnReject: { background: '#ef444422', color: '#f87171', border: '1px solid #ef444444', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
  btnPaid: { background: '#3b82f622', color: '#60a5fa', border: '1px solid #3b82f644', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
  emptyCell: { padding: '56px', textAlign: 'center', color: '#475569', fontSize: '14px' },
  // Modal
  modalOverlay: { position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '28px', width: '440px', maxWidth: '90vw' },
  modalTitle: { margin: '0 0 8px', fontSize: '18px', color: '#f1f5f9' },
  modalSub: { margin: '0 0 20px', color: '#94a3b8', fontSize: '14px' },
  modalLabel: { display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '8px' },
  modalTextarea: { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#f1f5f9', fontSize: '14px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
  btnGhost: { background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: '8px', padding: '9px 18px', cursor: 'pointer', fontSize: '14px' },
  btnRejectConfirm: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 },
}