// src/pages/UserPayoutPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const PAYMENT_METHODS = [
  { value: 'promptpay',      label: 'PromptPay',       icon: '📱', hint: 'เบอร์โทรหรือเลขบัตรประชาชน' },
  { value: 'bank_transfer',  label: 'Bank Transfer',   icon: '🏦', hint: 'เลขบัญชี, ชื่อธนาคาร, ชื่อบัญชี' },
  { value: 'paypal',         label: 'PayPal',          icon: '🅿️', hint: 'PayPal email' },
  { value: 'crypto',         label: 'Crypto (USDT)',   icon: '₿',  hint: 'USDT wallet address' },
];

export default function UserPayoutPage() {
  const navigate = useNavigate();

  const [profile, setProfile]       = useState(null);
  const [affiliate, setAffiliate]   = useState(null);
  const [balance, setBalance]       = useState(0);
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [errors, setErrors]         = useState({});

  const [method, setMethod]         = useState('promptpay');
  const [detail, setDetail]         = useState('');
  const [note, setNote]             = useState('');

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }

    // ดึง profile
    const { data: p } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, commission_balance, referral_code')
      .eq('id', user.id)
      .maybeSingle();
    setProfile(p);
    setBalance(p?.commission_balance || 0);

    // ดึง affiliate record (ถ้ามี)
    const { data: aff } = await supabase
      .from('affiliates')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    setAffiliate(aff);

    // ดึง payout history
    if (aff) {
      const { data: hist } = await supabase
        .from('affiliate_payouts')
        .select('id, total_amount, currency, status, payment_method, requested_at, paid_at, review_notes')
        .eq('affiliate_id', aff.id)
        .order('requested_at', { ascending: false })
        .limit(10);
      setHistory(hist || []);
    }

    setLoading(false);
  }

  const MIN_PAYOUT = 30; // €30 minimum
  const canRequest = balance >= MIN_PAYOUT;

  function validate() {
    const errs = {};
    if (balance < MIN_PAYOUT) errs.amount = `ยอดขั้นต่ำ €${MIN_PAYOUT} (ปัจจุบัน €${balance})`;
    if (!detail.trim()) errs.detail = 'กรุณากรอกข้อมูลการรับเงิน';
    return errs;
  }

  async function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    // ถ้ายังไม่มี affiliate record → สร้างก่อน
    let affId = affiliate?.id;
    if (!affId) {
      const { data: newAff } = await supabase
        .from('affiliates')
        .insert({
          auth_user_id: user.id,
          type: 'individual',
          referral_code: profile.referral_code,
          status: 'approved',
          contact_name: profile.username,
          contact_email: user.email,
        })
        .select('id')
        .single();
      affId = newAff?.id;
    }

    if (!affId) { setSubmitting(false); return; }

    // Insert payout request
    const { error } = await supabase.from('affiliate_payouts').insert({
      affiliate_id:   affId,
      total_amount:   balance,
      currency:       'EUR',
      payment_method: method,
      status:         'pending',
      requested_at:   new Date().toISOString(),
      review_notes:   note || null,
    });

    if (!error) {
      setSuccess(true);
      // reload history
      const { data: hist } = await supabase
        .from('affiliate_payouts')
        .select('id, total_amount, currency, status, payment_method, requested_at, paid_at, review_notes')
        .eq('affiliate_id', affId)
        .order('requested_at', { ascending: false })
        .limit(10);
      setHistory(hist || []);
      setAffiliate({ id: affId });
    }

    setSubmitting(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6366f1', fontSize: 16 }}>Loading…</div>
      </div>
    );
  }

  const selectedMethod = PAYMENT_METHODS.find(m => m.value === method);

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ maxWidth: 500, margin: '0 auto', background: '#fff', borderRadius: '0 0 30px 30px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', padding: '40px 20px 30px', color: '#fff', textAlign: 'center' }}>
          <button onClick={() => navigate(-1)} style={{ position: 'absolute', left: 16, top: 16, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 20, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>
            ← Back
          </button>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.8, fontWeight: 'bold' }}>TCN AFFILIATE</p>
          <h2 style={{ margin: '6px 0 4px', fontSize: 28, fontWeight: 900 }}>💸 Request Payout</h2>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', padding: '6px 20px', borderRadius: 20, fontSize: 22, fontWeight: 900, marginTop: 4 }}>
            €{balance.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>Available Balance</div>
        </div>

        <div style={{ padding: 20 }}>

          {/* Success state */}
          {success && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 16, padding: 20, textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 800, color: '#16a34a', fontSize: 16 }}>Request Submitted!</div>
              <div style={{ fontSize: 13, color: '#4ade80', marginTop: 4 }}>Admin จะตรวจสอบและโอนเงินให้ภายใน 1-3 วันทำการ</div>
            </div>
          )}

          {/* Not enough balance */}
          {!canRequest && !success && (
            <div style={{ background: '#fef9c3', border: '1.5px solid #fde047', borderRadius: 16, padding: 16, marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>⚠️</div>
              <div style={{ fontWeight: 700, color: '#92400e', fontSize: 14 }}>ยอดไม่ถึงขั้นต่ำ</div>
              <div style={{ fontSize: 12, color: '#a16207', marginTop: 4 }}>
                ต้องมีอย่างน้อย €{MIN_PAYOUT} ถึงจะ request ได้<br />
                ปัจจุบัน: €{balance.toFixed(2)}
              </div>
            </div>
          )}

          {/* Form */}
          {canRequest && !success && (
            <>
              {/* Payment Method */}
              <h3 style={Sx.sectionTitle}>Payment Method</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
                {PAYMENT_METHODS.map(m => (
                  <button key={m.value} onClick={() => { setMethod(m.value); setDetail(''); }}
                    style={{ ...Sx.methodBtn, ...(method === m.value ? Sx.methodBtnActive : {}) }}>
                    <span style={{ fontSize: 22 }}>{m.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Payment Detail */}
              <h3 style={Sx.sectionTitle}>
                {selectedMethod?.label} Details
                <span style={{ fontWeight: 400, fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>
                  {selectedMethod?.hint}
                </span>
              </h3>
              <textarea
                value={detail}
                onChange={e => { setDetail(e.target.value); setErrors(ev => ({ ...ev, detail: null })); }}
                placeholder={selectedMethod?.hint}
                rows={3}
                style={{ ...Sx.input, resize: 'none', marginBottom: 4 }}
              />
              {errors.detail && <div style={Sx.error}>{errors.detail}</div>}

              {/* Note */}
              <h3 style={{ ...Sx.sectionTitle, marginTop: 16 }}>Note (optional)</h3>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="หมายเหตุเพิ่มเติม..."
                style={{ ...Sx.input, marginBottom: 4 }}
              />

              {/* Summary */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, margin: '20px 0', }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#64748b', fontSize: 13 }}>จำนวนเงิน</span>
                  <span style={{ fontWeight: 800, fontSize: 18, color: '#6366f1' }}>€{balance.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#64748b', fontSize: 13 }}>ช่องทาง</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{selectedMethod?.icon} {selectedMethod?.label}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: 13 }}>เวลาดำเนินการ</span>
                  <span style={{ fontSize: 13, color: '#475569' }}>1-3 วันทำการ</span>
                </div>
              </div>

              <button onClick={handleSubmit} disabled={submitting}
                style={{ width: '100%', padding: 18, borderRadius: 30, border: 'none', background: submitting ? '#d1d5db' : 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', fontWeight: 800, fontSize: 17, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                {submitting ? '⏳ กำลังส่ง...' : '💸 ยืนยัน Request Payout'}
              </button>
            </>
          )}

          {/* Payout History */}
          {history.length > 0 && (
            <>
              <h3 style={{ ...Sx.sectionTitle, marginTop: 32 }}>ประวัติการถอนเงิน</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map(h => (
                  <div key={h.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>€{(h.total_amount || 0).toFixed(2)}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {h.payment_method} · {new Date(h.requested_at).toLocaleDateString('th-TH')}
                      </div>
                      {h.review_notes && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>📝 {h.review_notes}</div>}
                    </div>
                    <div style={{ ...Sx.statusPill, ...statusColor(h.status) }}>{h.status}</div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function statusColor(s) {
  return ({
    pending:  { background: '#fef9c3', color: '#92400e' },
    approved: { background: '#dbeafe', color: '#1e40af' },
    paid:     { background: '#dcfce7', color: '#166534' },
    rejected: { background: '#fee2e2', color: '#991b1b' },
  })[s] || { background: '#f1f5f9', color: '#475569' };
}

const Sx = {
  sectionTitle: { fontSize: 13, fontWeight: 800, color: '#6366f1', marginBottom: 12, marginTop: 0, textTransform: 'uppercase' },
  input: { width: '100%', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#000', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  error: { color: '#dc2626', fontSize: 12, marginBottom: 8 },
  methodBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', color: '#475569' },
  methodBtnActive: { background: '#ede9fe', border: '1.5px solid #6366f1', color: '#6366f1' },
  statusPill: { borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700 },
};