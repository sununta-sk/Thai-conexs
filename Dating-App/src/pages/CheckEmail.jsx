import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import logoImg from '../lib/LotusConnexs.jpeg';

export default function CheckEmail() {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (!email) { alert('No email address'); return; }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: window.location.origin + '/login?verified=1' },
    });
    setResending(false);
    if (error) alert(error.message);
    else setResent(true);
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <img src={logoImg} alt="logo" style={S.logo} />
        <div style={S.iconWrap}>📧</div>
        <h1 style={S.heading}>Check your email</h1>
        <p style={S.text}>
          We've sent a verification link to <br />
          <strong style={S.email}>{email || 'your email'}</strong>
        </p>
        <p style={S.subtext}>
          Click the link in the email to activate your account.<br />
          If you don't see it, check your spam folder.
        </p>

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
  page: { minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Segoe UI', sans-serif" },
  card: { background: '#1e293b', borderRadius: 24, padding: '40px 32px', maxWidth: 440, width: '100%', textAlign: 'center', border: '1px solid #334155', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' },
  logo: { width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 20px rgba(233,30,99,0.4)', marginBottom: 16 },
  iconWrap: { fontSize: 56, marginBottom: 16 },
  heading: { margin: '0 0 12px', fontSize: 26, fontWeight: 800, color: '#f1f5f9' },
  text: { color: '#cbd5e1', fontSize: 15, lineHeight: 1.6, margin: '0 0 16px' },
  email: { color: '#e91e63', fontWeight: 700 },
  subtext: { color: '#94a3b8', fontSize: 13, lineHeight: 1.6, margin: '0 0 24px' },
  resendBtn: { width: '100%', padding: '13px', borderRadius: 30, border: '1px solid #334155', background: 'transparent', color: '#e91e63', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 16 },
  successBox: { padding: '13px', borderRadius: 12, background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', fontWeight: 700, fontSize: 14, marginBottom: 16, border: '1px solid rgba(74, 222, 128, 0.3)' },
  backLink: { display: 'block', color: '#94a3b8', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginTop: 8 },
};
