import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import logoImg from '../lib/LotusConnexs.jpeg';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for Supabase to process the recovery token from URL
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });
    // Also check current session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { alert('Passwords do not match'); return; }
    if (password.length < 6) { alert('Password must be at least 6 characters'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { alert(error.message); return; }
    alert('Password updated! Please log in with your new password.');
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <img src={logoImg} alt="logo" style={S.logo} />
        <h1 style={S.heading}>Set new password</h1>

        {!ready ? (
          <p style={S.text}>Verifying reset link…</p>
        ) : (
          <>
            <p style={S.text}>Choose a strong new password for your account.</p>
            <form onSubmit={handleSubmit} style={S.form}>
              <input type="password" placeholder="New password (min 6 chars)"
                value={password} onChange={e => setPassword(e.target.value)}
                style={S.input} required minLength={6} />
              <input type="password" placeholder="Confirm new password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                style={S.input} required />
              <button type="submit" disabled={loading} style={{ ...S.btnPink, opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
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
  heading: { margin: '0 0 16px', fontSize: 26, fontWeight: 800, color: '#f1f5f9' },
  text: { color: '#cbd5e1', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' },
  form: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 },
  input: { padding: '13px 16px', borderRadius: 12, border: '1px solid #334155', fontSize: 15, background: '#0f172a', color: '#f1f5f9', outline: 'none' },
  btnPink: { padding: '14px', borderRadius: 30, border: 'none', background: '#e91e63', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 4 },
};
