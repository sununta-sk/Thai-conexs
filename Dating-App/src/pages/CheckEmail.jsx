import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import logoImg from '../lib/LotusConnexs.jpeg';

export default function CheckEmail() {
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const email     = params.get('email') || '';

  const [resending, setResending]       = useState(false);
  const [resent, setResent]             = useState(false);
  const [showWelcome, setShowWelcome]   = useState(true); // popup ยินดีต้อนรับ

  // ── Poll รอ email verified แล้วเด้งไป profile-setup ──────
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email_confirmed_at) {
        clearInterval(interval)
        navigate('/profile-setup')
      }
    }, 2000) // เช็คทุก 2 วินาที
    return () => clearInterval(interval)
  }, [navigate])

  const handleResend = async () => {
    if (!email) { alert('No email address'); return; }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: window.location.origin + '/profile-setup' },
    });
    setResending(false);
    if (error) alert(error.message);
    else setResent(true);
  };

  return (
    <div style={S.page}>

      {/* ── Welcome Popup ── */}
      {showWelcome && (
        <div style={S.overlay}>
          <div style={S.popup}>
            <div style={S.popupLogo}>🌸</div>
            <h2 style={S.popupTitle}>ยินดีต้อนรับสู่</h2>
            <div style={S.popupBrand}>Lotus ConneXs</div>
            <p style={S.popupSub}>Where Connections Bloom</p>
            <div style={S.popupDivider} />
            <p style={S.popupMsg}>
              สมัครสมาชิกสำเร็จแล้ว! 🎉<br />
              กรุณายืนยันอีเมลก่อนเข้าใช้งาน
            </p>
            <button style={S.popupBtn} onClick={() => setShowWelcome(false)}>
              ตกลง รับทราบแล้ว
            </button>
          </div>
        </div>
      )}

      {/* ── Check Email Card ── */}
      <div style={S.card}>
        <img src={logoImg} alt="logo" style={S.logo} />
        <div style={S.iconWrap}>📧</div>
        <h1 style={S.heading}>Check your email</h1>
        <p style={S.text}>
          We've sent a verification link to<br />
          <strong style={S.emailText}>{email || 'your email'}</strong>
        </p>
        <p style={S.subtext}>
          Click the link in the email to activate your account
          and complete your profile.<br /><br />
          If you don't see it, check your spam folder.
        </p>

        {/* Waiting indicator */}
        <div style={S.waitingBox}>
          <span style={S.dot} />
          Waiting for email confirmation…
        </div>

        {resent ? (
          <div style={S.successBox}>✓ Email sent! Check your inbox.</div>
        ) : (
          <button onClick={handleResend} disabled={resending} style={S.resendBtn}>
            {resending ? 'Sending…' : 'Resend email'}
          </button>
        )}
        <Link to="/login" style={S.backLink}>← Back to Login</Link>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily: "'Segoe UI', sans-serif",
  },

  // ── Popup ──
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  popup: {
    background: '#1e293b',
    borderRadius: 28,
    padding: '44px 36px',
    maxWidth: 400,
    width: '100%',
    textAlign: 'center',
    border: '1px solid #334155',
    boxShadow: '0 24px 64px rgba(233,30,99,0.3)',
  },
  popupLogo: { fontSize: 52, marginBottom: 12 },
  popupTitle: { margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#94a3b8' },
  popupBrand: { fontSize: 30, fontWeight: 900, color: '#e91e63', marginBottom: 4, letterSpacing: '0.5px' },
  popupSub: { fontSize: 13, color: '#64748b', margin: '0 0 24px', letterSpacing: '1px' },
  popupDivider: { height: 1, background: '#334155', margin: '0 0 24px' },
  popupMsg: {
    fontSize: 16,
    lineHeight: 1.7,
    color: '#cbd5e1',
    margin: '0 0 28px',
  },
  popupBtn: {
    width: '100%',
    padding: '15px',
    borderRadius: 30,
    border: 'none',
    background: 'linear-gradient(135deg, #e91e63, #c2185b)',
    color: '#fff',
    fontWeight: 800,
    fontSize: 16,
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(233,30,99,0.4)',
  },

  // ── Card ──
  card: {
    background: '#1e293b',
    borderRadius: 24,
    padding: '40px 32px',
    maxWidth: 440,
    width: '100%',
    textAlign: 'center',
    border: '1px solid #334155',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  logo: { width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 20px rgba(233,30,99,0.4)', marginBottom: 16 },
  iconWrap: { fontSize: 56, marginBottom: 16 },
  heading: { margin: '0 0 12px', fontSize: 26, fontWeight: 800, color: '#f1f5f9' },
  text: { color: '#cbd5e1', fontSize: 15, lineHeight: 1.6, margin: '0 0 16px' },
  emailText: { color: '#e91e63', fontWeight: 700 },
  subtext: { color: '#94a3b8', fontSize: 13, lineHeight: 1.6, margin: '0 0 24px' },
  waitingBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'rgba(233,30,99,0.08)',
    border: '1px solid rgba(233,30,99,0.2)',
    borderRadius: 12,
    padding: '12px 16px',
    color: '#e91e63',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 20,
  },
  dot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#e91e63',
    animation: 'pulse 1.5s infinite',
    flexShrink: 0,
  },
  resendBtn: { width: '100%', padding: '13px', borderRadius: 30, border: '1px solid #334155', background: 'transparent', color: '#e91e63', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 16 },
  successBox: { padding: '13px', borderRadius: 12, background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontWeight: 700, fontSize: 14, marginBottom: 16, border: '1px solid rgba(74,222,128,0.3)' },
  backLink: { display: 'block', color: '#94a3b8', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginTop: 8 },
};