import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabaseClient'

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
  { value: 'promptpay', label: 'PromptPay', icon: '📱' },
  { value: 'paypal', label: 'PayPal', icon: '🅿️' },
  { value: 'crypto', label: 'Crypto (USDT)', icon: '₿' },
]

export default function PayoutRequestPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prefilledAffId = searchParams.get('affiliate_id')
  const prefilledAmount = searchParams.get('amount')

  const [affiliates, setAffiliates] = useState([])
  const [selectedAffiliate, setSelectedAffiliate] = useState(null)
  const [affiliateSearch, setAffiliateSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [balance, setBalance] = useState(null)
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState({
    amount: prefilledAmount || '',
    payment_method: 'bank_transfer',
    payment_detail: '',
    note: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)

  useEffect(() => { fetchSettings() }, [])
  useEffect(() => {
    if (prefilledAffId) fetchAffiliate(prefilledAffId)
  }, [prefilledAffId])

  async function fetchSettings() {
    const { data } = await supabase.from('affiliate_settings').select('*').single()
    setSettings(data)
  }

  async function fetchAffiliate(id) {
    setLoading(true)
    const { data: aff } = await supabase
      .from('affiliates')
      .select('*, users(name, email, avatar_url)')
      .eq('id', id)
      .single()
    if (aff) {
      setSelectedAffiliate(aff)
      setAffiliateSearch(aff.users?.name || '')
      await fetchBalance(id)
    }
    setLoading(false)
  }

  async function fetchBalance(affId) {
    const [{ data: refs }, { data: pays }] = await Promise.all([
      supabase.from('affiliate_referrals').select('commission_amount').eq('affiliate_id', affId).eq('status', 'confirmed'),
      supabase.from('affiliate_payouts').select('amount').eq('affiliate_id', affId).eq('status', 'paid'),
    ])
    const earned = (refs || []).reduce((s, r) => s + (r.commission_amount || 0), 0)
    const paid = (pays || []).reduce((s, p) => s + (p.amount || 0), 0)
    setBalance(earned - paid)
  }

  async function searchAffiliates(q) {
    if (!q) { setAffiliates([]); return }
    const { data } = await supabase
      .from('affiliates')
      .select('*, users(name, email, avatar_url)')
      .or(`referral_code.ilike.%${q}%`)
      .limit(8)
    // Also search by user name/email via join workaround
    setAffiliates(data || [])
  }

  function validate() {
    const errs = {}
    if (!selectedAffiliate) errs.affiliate = 'Please select an affiliate'
    const amt = parseFloat(form.amount)
    if (!form.amount || isNaN(amt) || amt <= 0) errs.amount = 'Enter a valid amount'
    else if (balance !== null && amt > balance) errs.amount = `Exceeds available balance ($${balance.toFixed(2)})`
    else if (settings?.min_payout && amt < settings.min_payout) errs.amount = `Minimum payout is $${settings.min_payout}`
    if (!form.payment_detail.trim()) errs.payment_detail = 'Payment detail is required'
    return errs
  }

  async function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSubmitting(true)

    // Check auto-threshold: if amount >= auto_approve_threshold, auto-approve
    const amt = parseFloat(form.amount)
    const autoApprove = settings?.auto_approve_threshold && amt <= settings.auto_approve_threshold
    const status = autoApprove ? 'approved' : 'pending'

    const { error } = await supabase.from('affiliate_payouts').insert({
      affiliate_id: selectedAffiliate.id,
      amount: amt,
      payment_method: form.payment_method,
      payment_detail: form.payment_detail,
      note: form.note || null,
      status,
      reviewed_at: autoApprove ? new Date().toISOString() : null,
    })

    setSubmitting(false)
    if (!error) {
      setSuccess(true)
      setTimeout(() => navigate('/payouts'), 2000)
    }
  }

  const minThreshold = settings?.min_payout || 50
  const autoThreshold = settings?.auto_approve_threshold || null
  const meetsThreshold = balance !== null && balance >= minThreshold
  const enteredAmt = parseFloat(form.amount) || 0
  const willAutoApprove = autoThreshold && enteredAmt > 0 && enteredAmt <= autoThreshold

  if (success) {
    return (
      <AdminLayout>
        <div style={S.successScreen}>
          <div style={S.successIcon}>✓</div>
          <h2 style={S.successTitle}>Payout Request Submitted</h2>
          <p style={S.successSub}>
            {willAutoApprove ? 'Auto-approved! Will be processed shortly.' : 'Pending admin review.'}
          </p>
          <p style={{ color: '#475569', fontSize: '13px' }}>Redirecting…</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div style={S.page}>
        <button onClick={() => navigate(-1)} style={S.back}>← Back</button>
        <div style={S.layout}>
          {/* Form */}
          <div style={S.formCard}>
            <h1 style={S.formTitle}>Create Payout Request</h1>
            <p style={S.formSub}>Submit a withdrawal request for an affiliate</p>

            {/* Step 1: Select Affiliate */}
            <div style={S.section}>
              <label style={S.label}>1. Select Affiliate *</label>
              <div style={{ position: 'relative' }}>
                <input
                  value={affiliateSearch}
                  onChange={e => {
                    setAffiliateSearch(e.target.value)
                    setShowDropdown(true)
                    searchAffiliates(e.target.value)
                    if (!e.target.value) { setSelectedAffiliate(null); setBalance(null) }
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search by name, email, or referral code…"
                  style={{ ...S.input, ...(errors.affiliate ? S.inputError : {}) }}
                />
                {showDropdown && affiliates.length > 0 && (
                  <div style={S.dropdown}>
                    {affiliates.map(a => (
                      <div key={a.id} style={S.dropdownItem}
                        onClick={() => {
                          setSelectedAffiliate(a)
                          setAffiliateSearch(a.users?.name || a.referral_code)
                          setShowDropdown(false)
                          fetchBalance(a.id)
                        }}>
                        <div style={S.dropAvatar}>
                          {a.users?.avatar_url
                            ? <img src={a.users.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ color: '#e91e63', fontWeight: 700, fontSize: '13px' }}>{(a.users?.name || 'A')[0].toUpperCase()}</span>}
                        </div>
                        <div>
                          <div style={{ color: '#e2e8f0', fontSize: '14px' }}>{a.users?.name}</div>
                          <div style={{ color: '#475569', fontSize: '12px' }}>{a.users?.email} · {a.referral_code}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.affiliate && <span style={S.errorMsg}>{errors.affiliate}</span>}

              {/* Affiliate Info */}
              {selectedAffiliate && (
                <div style={S.affiliateInfo}>
                  <div style={S.infoRow}>
                    <span style={S.infoLabel}>Referral Code</span>
                    <span style={{ color: '#e91e63', fontWeight: 600 }}>{selectedAffiliate.referral_code}</span>
                  </div>
                  <div style={S.infoRow}>
                    <span style={S.infoLabel}>Commission Rate</span>
                    <span style={{ color: '#f1f5f9' }}>{selectedAffiliate.commission_rate || 20}%</span>
                  </div>
                  <div style={S.infoRow}>
                    <span style={S.infoLabel}>Available Balance</span>
                    {balance === null
                      ? <span style={{ color: '#64748b' }}>Loading…</span>
                      : <span style={{ color: meetsThreshold ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                          ${balance.toFixed(2)}
                          {!meetsThreshold && <span style={{ fontSize: '11px', color: '#f87171', marginLeft: '6px' }}>(min ${minThreshold})</span>}
                        </span>}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Amount */}
            <div style={S.section}>
              <label style={S.label}>2. Payout Amount (USD) *</label>
              <div style={S.amountWrap}>
                <span style={S.dollarSign}>$</span>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => { setForm(f => ({ ...f, amount: e.target.value })); setErrors(ev => ({ ...ev, amount: null })) }}
                  placeholder="0.00"
                  min={minThreshold}
                  max={balance || undefined}
                  style={{ ...S.amountInput, ...(errors.amount ? S.inputError : {}) }}
                />
                {balance !== null && (
                  <button onClick={() => setForm(f => ({ ...f, amount: balance.toFixed(2) }))} style={S.maxBtn}>
                    MAX
                  </button>
                )}
              </div>
              {errors.amount && <span style={S.errorMsg}>{errors.amount}</span>}

              {/* Auto-approve hint */}
              {willAutoApprove && (
                <div style={S.autoApproveHint}>
                  ⚡ This amount is ≤ ${autoThreshold} — will be <strong>auto-approved</strong> immediately
                </div>
              )}
              {enteredAmt > 0 && autoThreshold && enteredAmt > autoThreshold && (
                <div style={S.manualHint}>
                  📋 Amount exceeds auto-approve threshold (${autoThreshold}) — requires <strong>manual review</strong>
                </div>
              )}
            </div>

            {/* Step 3: Payment Method */}
            <div style={S.section}>
              <label style={S.label}>3. Payment Method *</label>
              <div style={S.methodGrid}>
                {PAYMENT_METHODS.map(m => (
                  <button key={m.value} onClick={() => setForm(f => ({ ...f, payment_method: m.value }))}
                    style={{ ...S.methodBtn, ...(form.payment_method === m.value ? S.methodBtnActive : {}) }}>
                    <span style={{ fontSize: '20px' }}>{m.icon}</span>
                    <span style={{ fontSize: '13px' }}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 4: Payment Detail */}
            <div style={S.section}>
              <label style={S.label}>4. Payment Detail *
                <span style={S.labelHint}>
                  {form.payment_method === 'bank_transfer' && '(Account no., bank, account name)'}
                  {form.payment_method === 'promptpay' && '(Phone or national ID)'}
                  {form.payment_method === 'paypal' && '(PayPal email)'}
                  {form.payment_method === 'crypto' && '(USDT wallet address)'}
                </span>
              </label>
              <textarea
                value={form.payment_detail}
                onChange={e => { setForm(f => ({ ...f, payment_detail: e.target.value })); setErrors(ev => ({ ...ev, payment_detail: null })) }}
                placeholder="Enter payment details…"
                style={{ ...S.textarea, ...(errors.payment_detail ? S.inputError : {}) }}
                rows={3}
              />
              {errors.payment_detail && <span style={S.errorMsg}>{errors.payment_detail}</span>}
            </div>

            {/* Optional Note */}
            <div style={S.section}>
              <label style={S.label}>Note (optional)</label>
              <input
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Internal note for admin…"
                style={S.input}
              />
            </div>

            <button onClick={handleSubmit} disabled={submitting || loading} style={{ ...S.btnSubmit, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Submitting…' : 'Submit Payout Request'}
            </button>
          </div>

          {/* Sidebar: Info */}
          <div style={S.sidebar}>
            <div style={S.sideCard}>
              <h3 style={S.sideTitle}>Payout Rules</h3>
              <div style={S.ruleItem}>
                <span style={S.ruleIcon}>💰</span>
                <div>
                  <div style={S.ruleLabel}>Minimum Amount</div>
                  <div style={S.ruleVal}>${settings?.min_payout || 50}</div>
                </div>
              </div>
              <div style={S.ruleItem}>
                <span style={S.ruleIcon}>⚡</span>
                <div>
                  <div style={S.ruleLabel}>Auto-Approve Threshold</div>
                  <div style={S.ruleVal}>${settings?.auto_approve_threshold || '—'} or less</div>
                </div>
              </div>
              <div style={S.ruleItem}>
                <span style={S.ruleIcon}>⏱️</span>
                <div>
                  <div style={S.ruleLabel}>Manual Review Time</div>
                  <div style={S.ruleVal}>1–3 business days</div>
                </div>
              </div>
              <div style={S.ruleItem}>
                <span style={S.ruleIcon}>📅</span>
                <div>
                  <div style={S.ruleLabel}>Processing Day</div>
                  <div style={S.ruleVal}>{settings?.payout_day || 'Every Monday'}</div>
                </div>
              </div>
            </div>

            <div style={{ ...S.sideCard, marginTop: '16px', background: '#e91e630a', border: '1px solid #e91e6333' }}>
              <h3 style={{ ...S.sideTitle, color: '#e91e63' }}>⚡ Auto-Approve Flow</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
                Requests ≤ ${settings?.auto_approve_threshold || 100} are approved instantly without manual review.
                Amounts above this threshold require admin approval before being paid.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

const S = {
  page: { padding: '24px', maxWidth: '1000px', margin: '0 auto', color: '#f1f5f9' },
  back: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px', padding: 0, marginBottom: '24px', display: 'block' },
  layout: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'flex-start' },
  formCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '32px' },
  formTitle: { margin: '0 0 4px', fontSize: '22px', fontWeight: 700 },
  formSub: { margin: '0 0 28px', color: '#64748b', fontSize: '14px' },
  section: { marginBottom: '24px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  labelHint: { fontWeight: 400, textTransform: 'none', color: '#475569', marginLeft: '8px', letterSpacing: 0 },
  input: { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '11px 14px', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  inputError: { borderColor: '#ef4444' },
  errorMsg: { display: 'block', color: '#f87171', fontSize: '12px', marginTop: '6px' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', zIndex: 100, marginTop: '4px', overflow: 'hidden' },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #0f172a' },
  dropAvatar: { width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  affiliateInfo: { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '14px', marginTop: '12px' },
  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #1e293b' },
  infoLabel: { color: '#64748b', fontSize: '13px' },
  amountWrap: { display: 'flex', alignItems: 'center', gap: '8px' },
  dollarSign: { background: '#334155', color: '#94a3b8', borderRadius: '8px 0 0 8px', padding: '11px 14px', fontSize: '16px', fontWeight: 600 },
  amountInput: { flex: 1, background: '#0f172a', border: '1px solid #334155', borderLeft: 'none', borderRadius: '0 8px 8px 0', padding: '11px 14px', color: '#f1f5f9', fontSize: '18px', fontWeight: 700, outline: 'none' },
  maxBtn: { background: '#e91e6322', color: '#e91e63', border: '1px solid #e91e6344', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 },
  autoApproveHint: { background: '#16a34a11', border: '1px solid #16a34a44', borderRadius: '6px', padding: '8px 12px', color: '#4ade80', fontSize: '13px', marginTop: '10px' },
  manualHint: { background: '#f59e0b11', border: '1px solid #f59e0b44', borderRadius: '6px', padding: '8px 12px', color: '#fbbf24', fontSize: '13px', marginTop: '10px' },
  methodGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' },
  methodBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '14px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', color: '#94a3b8', transition: 'all 0.15s' },
  methodBtnActive: { background: '#e91e6322', border: '1px solid #e91e63', color: '#e91e63' },
  textarea: { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '11px 14px', color: '#f1f5f9', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' },
  btnSubmit: { width: '100%', background: '#e91e63', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px', cursor: 'pointer', fontSize: '16px', fontWeight: 700, marginTop: '8px' },
  // Sidebar
  sidebar: { position: 'sticky', top: '24px' },
  sideCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' },
  sideTitle: { margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#f1f5f9' },
  ruleItem: { display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #0f172a' },
  ruleIcon: { fontSize: '18px', flexShrink: 0, marginTop: '2px' },
  ruleLabel: { color: '#64748b', fontSize: '12px', marginBottom: '2px' },
  ruleVal: { color: '#e2e8f0', fontSize: '14px', fontWeight: 600 },
  // Success
  successScreen: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' },
  successIcon: { width: '72px', height: '72px', borderRadius: '50%', background: '#16a34a22', border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: '#4ade80' },
  successTitle: { margin: 0, fontSize: '22px', color: '#f1f5f9' },
  successSub: { margin: 0, color: '#4ade80', fontSize: '14px' },
}