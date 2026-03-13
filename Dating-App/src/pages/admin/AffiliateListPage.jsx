import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabaseClient'

export default function AffiliateDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [affiliate, setAffiliate] = useState(null)
  const [referrals, setReferrals] = useState([])
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('referrals')
  const [togglingStatus, setTogglingStatus] = useState(false)

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    setLoading(true)
    const [{ data: aff }, { data: refs }, { data: pays }] = await Promise.all([
      supabase
        .from('affiliates')
        .select('*, users(id, name, email, avatar_url)')
        .eq('id', id)
        .single(),
      supabase
        .from('affiliate_referrals')
        .select('*, referred_user:users(name, email), plan:subscription_plans(name)')
        .eq('affiliate_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('affiliate_id', id)
        .order('created_at', { ascending: false }),
    ])
    setAffiliate(aff)
    setReferrals(refs || [])
    setPayouts(pays || [])
    setLoading(false)
  }

  async function toggleStatus() {
    setTogglingStatus(true)
    const next = affiliate.status === 'active' ? 'inactive' : 'active'
    await supabase.from('affiliates').update({ status: next }).eq('id', id)
    setAffiliate(prev => ({ ...prev, status: next }))
    setTogglingStatus(false)
  }

  if (loading) return <AdminLayout><div style={S.center}>Loading…</div></AdminLayout>
  if (!affiliate) return <AdminLayout><div style={S.center}>Affiliate not found</div></AdminLayout>

  const user = affiliate.users || {}
  const confirmedRefs = referrals.filter(r => r.status === 'confirmed')
  const totalEarned = confirmedRefs.reduce((s, r) => s + (r.commission_amount || 0), 0)
  const totalPaid = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0)
  const pendingBalance = totalEarned - totalPaid

  return (
    <AdminLayout>
      <div style={S.page}>
        {/* Header */}
        <div style={S.topBar}>
          <button onClick={() => navigate(-1)} style={S.back}>← Back</button>
          <button
            onClick={toggleStatus}
            disabled={togglingStatus}
            style={{ ...S.toggleBtn, background: affiliate.status === 'active' ? '#334155' : '#16a34a22', color: affiliate.status === 'active' ? '#94a3b8' : '#4ade80', border: `1px solid ${affiliate.status === 'active' ? '#475569' : '#16a34a'}` }}
          >
            {affiliate.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
        </div>

        {/* Profile Card */}
        <div style={S.profileCard}>
          <div style={S.avatar}>
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" style={S.avatarImg} />
              : <span style={S.avatarInitial}>{(user.name || 'A')[0].toUpperCase()}</span>}
          </div>
          <div style={S.profileInfo}>
            <div style={S.nameRow}>
              <h2 style={S.profileName}>{user.name || 'Unknown'}</h2>
              <span style={{ ...S.statusBadge, background: affiliate.status === 'active' ? '#16a34a33' : '#33415555', color: affiliate.status === 'active' ? '#4ade80' : '#94a3b8' }}>
                {affiliate.status}
              </span>
            </div>
            <p style={S.profileEmail}>{user.email}</p>
            <div style={S.metaRow}>
              <span style={S.metaTag}>Code: <strong style={{ color: '#e91e63' }}>{affiliate.referral_code}</strong></span>
              <span style={S.metaTag}>Tier: {affiliate.tier || 'standard'}</span>
              <span style={S.metaTag}>Commission: {affiliate.commission_rate || 20}%</span>
              <span style={S.metaTag}>Joined: {new Date(affiliate.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={S.statsGrid}>
          {[
            { label: 'Total Referrals', value: referrals.length, sub: `${confirmedRefs.length} confirmed` },
            { label: 'Total Earned', value: `$${totalEarned.toFixed(2)}`, sub: 'from confirmed referrals' },
            { label: 'Total Paid', value: `$${totalPaid.toFixed(2)}`, sub: `${payouts.filter(p => p.status === 'paid').length} payouts` },
            { label: 'Pending Balance', value: `$${pendingBalance.toFixed(2)}`, sub: 'available to withdraw', accent: true },
          ].map(s => (
            <div key={s.label} style={{ ...S.statCard, ...(s.accent ? S.statCardAccent : {}) }}>
              <div style={{ ...S.statVal, color: s.accent ? '#e91e63' : '#f1f5f9' }}>{s.value}</div>
              <div style={S.statLabel}>{s.label}</div>
              <div style={S.statSub}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={S.tabBar}>
          {[
            { key: 'referrals', label: `Referrals (${referrals.length})` },
            { key: 'payouts', label: `Payouts (${payouts.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ ...S.tabBtn, ...(tab === t.key ? S.tabActive : {}) }}>
              {t.label}
            </button>
          ))}

          {tab === 'payouts' && pendingBalance > 0 && (
            <button
              onClick={() => navigate(`/payouts/new?affiliate_id=${id}&amount=${pendingBalance.toFixed(2)}`)}
              style={{ ...S.btnPink, marginLeft: 'auto' }}
            >
              + Create Payout (${pendingBalance.toFixed(2)})
            </button>
          )}
        </div>

        {/* Referrals Table */}
        {tab === 'referrals' && (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>{['Referred User', 'Plan', 'Commission', 'Status', 'Date'].map(h =>
                  <th key={h} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {referrals.length === 0
                  ? <tr><td colSpan={5} style={S.empty}>No referrals yet</td></tr>
                  : referrals.map(r => (
                    <tr key={r.id} style={S.trHover}>
                      <td style={S.td}>
                        <div style={{ color: '#e2e8f0' }}>{r.referred_user?.name || '—'}</div>
                        <div style={S.cellSub}>{r.referred_user?.email}</div>
                      </td>
                      <td style={S.td}>{r.plan?.name || '—'}</td>
                      <td style={S.td}><strong style={{ color: '#4ade80' }}>${(r.commission_amount || 0).toFixed(2)}</strong></td>
                      <td style={S.td}><span style={{ ...S.pill, ...refStatusStyle(r.status) }}>{r.status}</span></td>
                      <td style={S.td}>{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payouts Table */}
        {tab === 'payouts' && (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>{['Amount', 'Method', 'Status', 'Note', 'Requested', 'Paid At'].map(h =>
                  <th key={h} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {payouts.length === 0
                  ? <tr><td colSpan={6} style={S.empty}>No payouts yet</td></tr>
                  : payouts.map(p => (
                    <tr key={p.id} style={S.trHover}>
                      <td style={S.td}><strong style={{ color: '#f1f5f9' }}>${(p.amount || 0).toFixed(2)}</strong></td>
                      <td style={S.td}>{p.payment_method || '—'}</td>
                      <td style={S.td}><span style={{ ...S.pill, ...payoutStatusStyle(p.status) }}>{p.status}</span></td>
                      <td style={S.td}><span style={{ color: '#94a3b8', fontSize: '13px' }}>{p.note || '—'}</span></td>
                      <td style={S.td}>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td style={S.td}>{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function refStatusStyle(s) {
  return { pending: { background: '#f59e0b22', color: '#fbbf24' }, confirmed: { background: '#16a34a22', color: '#4ade80' }, rejected: { background: '#ef444422', color: '#f87171' } }[s] || { background: '#33415544', color: '#94a3b8' }
}
function payoutStatusStyle(s) {
  return { pending: { background: '#f59e0b22', color: '#fbbf24' }, approved: { background: '#3b82f622', color: '#60a5fa' }, paid: { background: '#16a34a22', color: '#4ade80' }, rejected: { background: '#ef444422', color: '#f87171' } }[s] || { background: '#33415544', color: '#94a3b8' }
}

const S = {
  page: { padding: '24px', maxWidth: '1100px', margin: '0 auto', color: '#f1f5f9' },
  center: { textAlign: 'center', padding: '80px', color: '#64748b', fontSize: '16px' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
  back: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' },
  toggleBtn: { padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 },
  profileCard: { display: 'flex', alignItems: 'flex-start', gap: '20px', background: '#1e293b', borderRadius: '12px', padding: '28px', marginBottom: '20px', border: '1px solid #334155' },
  avatar: { width: '76px', height: '76px', borderRadius: '50%', overflow: 'hidden', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid #e91e6344' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInitial: { fontSize: '30px', color: '#e91e63', fontWeight: 700 },
  profileInfo: { flex: 1 },
  nameRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' },
  profileName: { margin: 0, fontSize: '22px', fontWeight: 700, color: '#f1f5f9' },
  statusBadge: { borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 600 },
  profileEmail: { margin: '0 0 12px', color: '#64748b', fontSize: '14px' },
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  metaTag: { background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#94a3b8' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
  statCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', textAlign: 'center' },
  statCardAccent: { border: '1px solid #e91e6355', background: '#e91e630a' },
  statVal: { fontSize: '26px', fontWeight: 700, marginBottom: '6px' },
  statLabel: { fontSize: '13px', color: '#94a3b8', marginBottom: '4px' },
  statSub: { fontSize: '11px', color: '#475569' },
  tabBar: { display: 'flex', alignItems: 'center', gap: '4px', borderBottom: '1px solid #1e293b', paddingBottom: '0', marginBottom: '0' },
  tabBtn: { background: 'none', border: 'none', borderBottom: '2px solid transparent', color: '#64748b', cursor: 'pointer', padding: '12px 20px', fontSize: '14px', transition: 'all 0.15s' },
  tabActive: { color: '#e91e63', borderBottomColor: '#e91e63', fontWeight: 600 },
  btnPink: { background: '#e91e63', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 },
  tableWrap: { background: '#1e293b', border: '1px solid #334155', borderRadius: '0 0 12px 12px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', background: '#0f172a', borderBottom: '1px solid #334155' },
  trHover: { borderBottom: '1px solid #0f172a', cursor: 'default' },
  td: { padding: '14px 16px', fontSize: '14px', verticalAlign: 'middle' },
  cellSub: { color: '#475569', fontSize: '12px', marginTop: '2px' },
  pill: { display: 'inline-block', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 500 },
  empty: { padding: '48px', textAlign: 'center', color: '#475569', fontSize: '14px' },
}