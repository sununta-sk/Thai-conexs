import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import logoImg from '../lib/LotusConnexs.jpeg';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    setLoading(false);
    if (error) { alert(error.message); return; }
    setSent(true);
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <img src={logoImg} alt="logo" style={S.logo} />
        <h1 style={S.heading}>Forgot password?</h1>

        {sent ? (
          <>
            <div style={S.iconWrap}>📧</div>
            <p style={S.text}>
              We've sent a password reset link to<br />
              <strong style={S.email}>{email}</strong>
            </p>
            <p style={S.subtext}>
              Click the link in the email to reset your password.<br />
              If you don't see it, check your spam folder.
            </p>
            <Link to="/login" style={S.backLinkBtn}>Back to Login</Link>
          </>
        ) : (
          <>
            <p style={S.text}>Enter your email and we'll send you a link to reset your password.</p>
            <form onSubmit={handleSubmit} style={S.form}>
              <input type="email" placeholder="Email"
                value={email} onChange={e => setEmail(e.target.value)}
                style={S.input} required />
              <button type="submit" disabled={loading} style={{ ...S.btnPink, opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <Link to="/login" style={S.backLink}>← Back to Login</Link>
          </>
        )}
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Segoe UI', sans-serif" },
  card: { background: '#1e293b', borderRadius: 24, padding: '40px 32px', maxWidth: 420, width: '100%', textAlign: 'center', border: '1px solid #334155', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' },
  logo: { width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 20px rgba(233,30,99,0.4)', marginBottom: 16 },
  iconWrap: { fontSize: 56, marginBottom: 16 },
  heading: { margin: '0 0 16px', fontSize: 26, fontWeight: 800, color: '#f1f5f9' },
  text: { color: '#cbd5e1', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' },
  email: { color: '#e91e63', fontWeight: 700 },
  subtext: { color: '#94a3b8', fontSize: 13, lineHeight: 1.6, margin: '0 0 24px' },
  form: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 },
  input: { padding: '13px 16px', borderRadius: 12, border: '1px solid #334155', fontSize: 15, background: '#0f172a', color: '#f1f5f9', outline: 'none' },
  btnPink: { padding: '14px', borderRadius: 30, border: 'none', background: '#e91e63', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 4 },
  backLink: { display: 'block', color: '#94a3b8', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginTop: 20 },
  backLinkBtn: { display: 'inline-block', marginTop: 16, padding: '12px 28px', borderRadius: 30, background: '#e91e63', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14 },
};
