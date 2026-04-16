import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
  { value: 'promptpay',     label: 'PromptPay',     icon: '📱' },
  { value: 'paypal',        label: 'PayPal',         icon: '🅿️' },
]

// ── รายชื่อธนาคารไทยทั้งหมด ──
const THAI_BANKS = [
  { code: 'SCB',   name: 'ธนาคารไทยพาณิชย์ (SCB)' },
  { code: 'KBANK', name: 'ธนาคารกสิกรไทย (KBank)' },
  { code: 'BBL',   name: 'ธนาคารกรุงเทพ (BBL)' },
  { code: 'KTB',   name: 'ธนาคารกรุงไทย (KTB)' },
  { code: 'BAY',   name: 'ธนาคารกรุงศรีอยุธยา (Krungsri)' },
  { code: 'TTB',   name: 'ธนาคารทหารไทยธนชาต (TTB)' },
  { code: 'GSB',   name: 'ธนาคารออมสิน (GSB)' },
  { code: 'BAAC',  name: 'ธนาคารเพื่อการเกษตรและสหกรณ์ (BAAC)' },
  { code: 'GHB',   name: 'ธนาคารอาคารสงเคราะห์ (GHB)' },
  { code: 'CIMBT', name: 'ธนาคารซีไอเอ็มบีไทย (CIMB)' },
  { code: 'UOB',   name: 'ธนาคารยูโอบี (UOB)' },
  { code: 'TISCO', name: 'ธนาคารทิสโก้ (TISCO)' },
  { code: 'KKP',   name: 'ธนาคารเกียรตินาคินภัทร (KKP)' },
  { code: 'LHFG',  name: 'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)' },
  { code: 'IBANK', name: 'ธนาคารอิสลามแห่งประเทศไทย (IBANK)' },
  { code: 'OTHER', name: 'อื่นๆ / ต่างประเทศ' },
]

export default function PayoutRequestPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prefilledAmount = searchParams.get('amount')

  const [settings, setSettings] = useState(null)

  const [payee, setPayee] = useState({
    firstName:  '',
    middleName: '',
    lastName:   '',
    phone:      '',
    email:      '',
  })

  // ── เปลี่ยน payment_detail เป็น 3 ช่อง ──
  const [bankInfo, setBankInfo] = useState({
    bankCode:      '',
    accountNumber: '',
    extra:         '',
  })

  const [form, setForm] = useState({
    amount:         prefilledAmount || '',
    payment_method: 'bank_transfer',
    note:           '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors]         = useState({})
  const [success, setSuccess]       = useState(false)

  useEffect(() => { fetchSettings() }, [])

  async function fetchSettings() {
    const { data } = await supabase.from('affiliate_settings').select('*').maybeSingle()
    setSettings(data)
  }

  function validate() {
    const errs = {}
    if (!payee.firstName.trim())     errs.firstName     = 'First name is required'
    if (!payee.lastName.trim())      errs.lastName      = 'Last name is required'
    if (!payee.phone.trim())         errs.phone         = 'Phone number is required'
    if (!payee.email.trim())         errs.email         = 'Email is required'
    const amt = parseFloat(form.amount)
    if (!form.amount || isNaN(amt) || amt <= 0) errs.amount = 'Enter a valid amount'
    else if (settings?.min_payout && amt < settings.min_payout) errs.amount = `Minimum payout is €${settings.min_payout}`
    // ── validate bank fields เฉพาะ bank_transfer ──
    if (form.payment_method === 'bank_transfer') {
      if (!bankInfo.bankCode)          errs.bankCode      = 'กรุณาเลือกธนาคาร'
      if (!bankInfo.accountNumber.trim()) errs.accountNumber = 'กรุณากรอกเลขบัญชี'
    } else {
      if (!bankInfo.accountNumber.trim()) errs.accountNumber = 'กรุณากรอกDetails'
    }
    return errs
  }

  // ── สร้าง payment_detail string จาก 3 ช่อง ──
  function buildPaymentDetail() {
    if (form.payment_method === 'bank_transfer') {
      const bank = THAI_BANKS.find(b => b.code === bankInfo.bankCode)
      const parts = [bank?.name || bankInfo.bankCode, bankInfo.accountNumber]
      if (bankInfo.extra.trim()) parts.push(bankInfo.extra)
      return parts.join(' | ')
    }
    const parts = [bankInfo.accountNumber]
    if (bankInfo.extra.trim()) parts.push(bankInfo.extra)
    return parts.join(' | ')
  }

  async function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSubmitting(true)

    const amt         = parseFloat(form.amount)
    const autoApprove = settings?.auto_approve_threshold && amt <= settings.auto_approve_threshold
    const status      = autoApprove ? 'approved' : 'pending'
    const fullName    = [payee.firstName, payee.middleName, payee.lastName].filter(Boolean).join(' ')
    const paymentDetail = buildPaymentDetail()

    // ── ถ้าอีเมลซ้ำ ใช้ record เดิม ──
    let affId = null
    const { data: existing } = await supabase
      .from('affiliates')
      .select('id')
      .eq('contact_email', payee.email)
      .maybeSingle()

    if (existing) {
      affId = existing.id
      // อัปเดต payout_details ด้วย
      await supabase.from('affiliates').update({
        contact_name:  fullName,
        contact_phone: payee.phone,
        payout_method: form.payment_method,
        payout_details: paymentDetail,
      }).eq('id', affId)
    } else {
      const { data: newAff, error: affErr } = await supabase
        .from('affiliates')
        .insert({
          type:           'individual',
          contact_name:   fullName,
          contact_email:  payee.email,
          contact_phone:  payee.phone,
          status:         'approved',
          payout_method:  form.payment_method,
          payout_details: paymentDetail,
          referral_code:  `TCN-${Date.now().toString(36).toUpperCase().slice(-6)}`,
        })
        .select('id')
        .single()

      if (affErr || !newAff) {
        setErrors({ submit: 'Failed to create record: ' + affErr?.message })
        setSubmitting(false)
        return
      }
      affId = newAff.id
    }

    const { error } = await supabase.from('affiliate_payouts').insert({
      affiliate_id:   affId,
      total_amount:   amt,
      currency:       'EUR',
      payment_method: form.payment_method,
      payment_detail: paymentDetail,
      review_notes:   form.note || null,
      status,
      requested_at:   new Date().toISOString(),
    })

    setSubmitting(false)
    if (!error) {
      setSuccess(true)
      setTimeout(() => navigate('/admin/payouts'), 2000)
    }
  }

  const minThreshold    = settings?.min_payout || 30
  const autoThreshold   = settings?.auto_approve_threshold || null
  const enteredAmt      = parseFloat(form.amount) || 0
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

  const isBankTransfer = form.payment_method === 'bank_transfer'

  return (
    <AdminLayout>
      <div style={S.page}>
        <button onClick={() => navigate(-1)} style={S.back}>← Back</button>
        <div style={S.layout}>
          <div style={S.formCard}>
            <h1 style={S.formTitle}>Create Payout Request</h1>
            <p style={S.formSub}>Submit a withdrawal request for an affiliate</p>

            {/* ── Step 1: Payee Information ── */}
            <div style={S.section}>
              <label style={S.label}>1. Payee Information *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <input value={payee.firstName} onChange={e => { setPayee(p => ({ ...p, firstName: e.target.value })); setErrors(ev => ({ ...ev, firstName: null })) }}
                    placeholder="First Name *" style={{ ...S.input, ...(errors.firstName ? S.inputError : {}) }} />
                  {errors.firstName && <span style={S.errorMsg}>{errors.firstName}</span>}
                </div>
                <input value={payee.middleName} onChange={e => setPayee(p => ({ ...p, middleName: e.target.value }))}
                  placeholder="Middle Name" style={S.input} />
                <div>
                  <input value={payee.lastName} onChange={e => { setPayee(p => ({ ...p, lastName: e.target.value })); setErrors(ev => ({ ...ev, lastName: null })) }}
                    placeholder="Last Name *" style={{ ...S.input, ...(errors.lastName ? S.inputError : {}) }} />
                  {errors.lastName && <span style={S.errorMsg}>{errors.lastName}</span>}
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <input value={payee.phone} onChange={e => { setPayee(p => ({ ...p, phone: e.target.value })); setErrors(ev => ({ ...ev, phone: null })) }}
                  placeholder="📱 Phone Number * (required)"
                  style={{ ...S.input, ...(errors.phone ? S.inputError : {}), borderColor: errors.phone ? '#ef4444' : payee.phone ? '#10b981' : '#334155' }} />
                {errors.phone && <span style={S.errorMsg}>{errors.phone}</span>}
                <span style={{ fontSize: 11, color: '#475569', marginTop: 4, display: 'block' }}>ใช้สำหรับติดต่อและยืนยันการโอนเงิน</span>
              </div>
              <div>
                <input value={payee.email} onChange={e => { setPayee(p => ({ ...p, email: e.target.value })); setErrors(ev => ({ ...ev, email: null })) }}
                  placeholder="✉️ Email * (for sending slip)" type="email"
                  style={{ ...S.input, ...(errors.email ? S.inputError : {}) }} />
                {errors.email && <span style={S.errorMsg}>{errors.email}</span>}
                <span style={{ fontSize: 11, color: '#475569', marginTop: 4, display: 'block' }}>สลิปการโอนเงินจะส่งไปยังอีเมลนี้</span>
              </div>
            </div>

            {/* ── Step 2: Amount ── */}
            <div style={S.section}>
              <label style={S.label}>2. Payout Amount (EUR) *</label>
              <div style={S.amountWrap}>
                <span style={S.dollarSign}>€</span>
                <input type="number" value={form.amount}
                  onChange={e => { setForm(f => ({ ...f, amount: e.target.value })); setErrors(ev => ({ ...ev, amount: null })) }}
                  placeholder="0.00" min={minThreshold}
                  style={{ ...S.amountInput, ...(errors.amount ? S.inputError : {}) }} />
              </div>
              {errors.amount && <span style={S.errorMsg}>{errors.amount}</span>}
              {willAutoApprove && <div style={S.autoApproveHint}>⚡ Will be <strong>auto-approved</strong> immediately</div>}
              {enteredAmt > 0 && autoThreshold && enteredAmt > autoThreshold && <div style={S.manualHint}>📋 Requires <strong>manual review</strong></div>}
            </div>

            {/* ── Step 3: Payment Method ── */}
            <div style={S.section}>
              <label style={S.label}>3. Payment Method *</label>
              <div style={S.methodGrid}>
                {PAYMENT_METHODS.map(m => (
                  <button key={m.value} onClick={() => { setForm(f => ({ ...f, payment_method: m.value })); setBankInfo({ bankCode: '', accountNumber: '', extra: '' }) }}
                    style={{ ...S.methodBtn, ...(form.payment_method === m.value ? S.methodBtnActive : {}) }}>
                    <span style={{ fontSize: '20px' }}>{m.icon}</span>
                    <span style={{ fontSize: '13px' }}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Step 4: Bank Details (3 ช่อง) ── */}
            <div style={S.section}>
              <label style={S.label}>
                4. {isBankTransfer ? 'ข้อมูลธนาคาร *' : 'Payment Detail *'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 10 }}>

                {/* ช่อง 1: ธนาคาร (dropdown) หรือ account detail */}
                <div>
                  {isBankTransfer ? (
                    <select
                      value={bankInfo.bankCode}
                      onChange={e => { setBankInfo(b => ({ ...b, bankCode: e.target.value })); setErrors(ev => ({ ...ev, bankCode: null })) }}
                      style={{ ...S.input, ...(errors.bankCode ? S.inputError : {}), color: bankInfo.bankCode ? '#f1f5f9' : '#475569' }}>
                      <option value="">🏦 เลือกธนาคาร *</option>
                      {THAI_BANKS.map(b => (
                        <option key={b.code} value={b.code}>{b.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div>
  <input
    value={bankInfo.extra}
    onChange={e => setBankInfo(b => ({ ...b, extra: e.target.value }))}
    placeholder="อื่นๆ (optional)"
    style={S.input} />
    <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
      ⚠️ ชื่อผู้รับเงินต้องตรงกับชื่อเจ้าของบัญชีเท่านั้น
    </span>
</div>
                  )}
                  {errors.bankCode && <span style={S.errorMsg}>{errors.bankCode}</span>}
                </div>

                {/* ช่อง 2: เลขบัญชี (เฉพาะ bank transfer) */}
                {isBankTransfer && (
                  <div>
                    <input
                      value={bankInfo.accountNumber}
                      onChange={e => { setBankInfo(b => ({ ...b, accountNumber: e.target.value })); setErrors(ev => ({ ...ev, accountNumber: null })) }}
                      placeholder="เลขบัญชี *"
                      style={{ ...S.input, ...(errors.accountNumber ? S.inputError : {}) }} />
                    {errors.accountNumber && <span style={S.errorMsg}>{errors.accountNumber}</span>}
                  </div>
                )}

                {/* ช่อง 3: อื่นๆ */}
                <div>
                  <input
                    value={bankInfo.extra}
                    onChange={e => setBankInfo(b => ({ ...b, extra: e.target.value }))}
                    placeholder="อื่นๆ (optional)"
                    style={S.input} />
                </div>
              </div>

              {/* Preview */}
              {(bankInfo.bankCode || bankInfo.accountNumber) && (
                <div style={{ marginTop: 8, background: '#0f172a', borderRadius: 8, padding: '8px 12px', color: '#94a3b8', fontSize: 12 }}>
                  📋 {buildPaymentDetail()}
                </div>
              )}
            </div>

            {/* ── Note ── */}
            <div style={S.section}>
              <label style={S.label}>Note (optional)</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Internal note for admin…" style={S.input} />
            </div>

            {errors.submit && (
              <div style={{ background: '#ef444422', border: '1px solid #ef444444', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 12 }}>
                ❌ {errors.submit}
              </div>
            )}

            <button onClick={handleSubmit} disabled={submitting} style={{ ...S.btnSubmit, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Submitting…' : 'Submit Payout Request'}
            </button>
          </div>

          {/* Sidebar */}
          <div style={S.sidebar}>
            <div style={S.sideCard}>
              <h3 style={S.sideTitle}>Payout Rules</h3>
              <div style={S.ruleItem}><span style={S.ruleIcon}>💰</span><div><div style={S.ruleLabel}>Minimum Amount</div><div style={S.ruleVal}>€{minThreshold}</div></div></div>
              <div style={S.ruleItem}><span style={S.ruleIcon}>⚡</span><div><div style={S.ruleLabel}>Auto-Approve</div><div style={S.ruleVal}>€{autoThreshold || '—'} or less</div></div></div>
              <div style={S.ruleItem}><span style={S.ruleIcon}>⏱️</span><div><div style={S.ruleLabel}>Manual Review</div><div style={S.ruleVal}>1–3 business days</div></div></div>
              <div style={S.ruleItem}><span style={S.ruleIcon}>📅</span><div><div style={S.ruleLabel}>Processing Day</div><div style={S.ruleVal}>{settings?.payout_day || 'Every Monday'}</div></div></div>
            </div>
            <div style={{ ...S.sideCard, marginTop: 16, background: '#6366f111', border: '1px solid #6366f133' }}>
              <h3 style={{ ...S.sideTitle, color: '#818cf8' }}>📋 Required Info</h3>
              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
  ✅ ชื่อ-นามสกุล<br />
  ✅ เบอร์โทรศัพท์ (บังคับ)<br />
  ✅ อีเมล (รับสลิปโอนเงิน)<br />
  ✅ ธนาคาร + เลขบัญชี<br />
  <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 12 }}>
    ⚠️ ชื่อผู้รับเงินต้องตรงกับชื่อเจ้าของบัญชีเท่านั้น
  </span>
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
  input: { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '11px 14px', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  inputError: { borderColor: '#ef4444' },
  errorMsg: { display: 'block', color: '#f87171', fontSize: '12px', marginTop: '4px' },
  amountWrap: { display: 'flex', alignItems: 'center', gap: '8px' },
  dollarSign: { background: '#334155', color: '#94a3b8', borderRadius: '8px 0 0 8px', padding: '11px 14px', fontSize: '16px', fontWeight: 600 },
  amountInput: { flex: 1, background: '#0f172a', border: '1px solid #334155', borderLeft: 'none', borderRadius: '0 8px 8px 0', padding: '11px 14px', color: '#f1f5f9', fontSize: '18px', fontWeight: 700, outline: 'none' },
  autoApproveHint: { background: '#16a34a11', border: '1px solid #16a34a44', borderRadius: '6px', padding: '8px 12px', color: '#4ade80', fontSize: '13px', marginTop: '10px' },
  manualHint: { background: '#f59e0b11', border: '1px solid #f59e0b44', borderRadius: '6px', padding: '8px 12px', color: '#fbbf24', fontSize: '13px', marginTop: '10px' },
  methodGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
  methodBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '14px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', color: '#94a3b8' },
  methodBtnActive: { background: '#e91e6322', border: '1px solid #e91e63', color: '#e91e63' },
  btnSubmit: { width: '100%', background: '#e91e63', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px', cursor: 'pointer', fontSize: '16px', fontWeight: 700, marginTop: '8px' },
  sidebar: { position: 'sticky', top: '24px' },
  sideCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' },
  sideTitle: { margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#f1f5f9' },
  ruleItem: { display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #0f172a' },
  ruleIcon: { fontSize: '18px', flexShrink: 0, marginTop: '2px' },
  ruleLabel: { color: '#64748b', fontSize: '12px', marginBottom: '2px' },
  ruleVal: { color: '#e2e8f0', fontSize: '14px', fontWeight: 600 },
  successScreen: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' },
  successIcon: { width: '72px', height: '72px', borderRadius: '50%', background: '#16a34a22', border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: '#4ade80' },
  successTitle: { margin: 0, fontSize: '22px', color: '#f1f5f9' },
  successSub: { margin: 0, color: '#4ade80', fontSize: '14px' },
}