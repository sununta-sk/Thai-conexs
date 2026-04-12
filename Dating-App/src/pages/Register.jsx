import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Register() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [photos, setPhotos]     = useState([]);
  const [current, setCurrent]   = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('profiles').select('avatar_url')
      .not('avatar_url', 'is', null).neq('avatar_url', '').limit(20)
      .then(({ data }) => {
        if (data && data.length > 0)
          setPhotos([...data].sort(() => Math.random() - 0.5).map(p => p.avatar_url));
      });
  }, []);

  useEffect(() => {
    if (photos.length === 0) return;
    const timer = setInterval(() => setCurrent(prev => (prev + 1) % photos.length), 3000);
    return () => clearInterval(timer);
  }, [photos]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirm) { alert('Passwords do not match'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) alert(error.message);
    else { alert('Registration successful! Please check your email.'); navigate('/login'); }
  };

  const getPhoto = (offset) => photos.length > 0 ? photos[(current + offset) % photos.length] : null;

  return (
    <div style={S.page}>

      {/* ── LEFT: Register Form ── */}
      <div style={S.formWrap}>
        <div style={S.formInner}>
          <h1 style={S.heading}>Create account</h1>
          <p style={S.subheading}>Join Thai Conexns today ✨</p>

          <form onSubmit={handleRegister} style={S.form}>
            <input type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} style={S.input} required />
            <input type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} style={S.input} required />
            <input type="password" placeholder="Confirm Password" value={confirm}
              onChange={e => setConfirm(e.target.value)} style={S.input} required />
            <button type="submit" disabled={loading} style={{ ...S.btnPink, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating account…' : 'Sign Up'}
            </button>
          </form>

          <p style={S.loginText}>
            Already have an account? <Link to="/login" style={S.loginLink}>Log In</Link>
          </p>
        </div>
      </div>

      {/* ── RIGHT: Stacked Cards ── */}
      <div style={S.cardsWrap}>
        {photos.length > 0 ? (
          <div style={S.cardStack}>
            {getPhoto(2) && (
              <div style={{ ...S.card, ...S.card3 }}>
                <img src={getPhoto(2)} alt="" style={S.cardImg} />
              </div>
            )}
            {getPhoto(1) && (
              <div style={{ ...S.card, ...S.card2 }}>
                <img src={getPhoto(1)} alt="" style={S.cardImg} />
              </div>
            )}
            <div style={{ ...S.card, ...S.card1 }}>
              <img src={getPhoto(0)} alt="" style={S.cardImg} />
              <div style={S.cardGradient} />
              <div style={S.dots}>
                {photos.slice(0, Math.min(photos.length, 5)).map((_, i) => (
                  <div key={i} style={{ ...S.dot, ...(i === current % Math.min(photos.length, 5) ? S.dotActive : {}) }} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={S.fallback}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💕</div>
            <div style={{ color: '#e91e63', fontWeight: 700, fontSize: '16px' }}>Find your match</div>
          </div>
        )}
      </div>

    </div>
  );
}

const S = {
  page: { display: 'flex', minHeight: '100vh', background: '#fff' },
  formWrap: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', background: '#fff' },
  formInner: { width: '100%', maxWidth: '340px' },
  heading: { margin: '0 0 4px', fontSize: '28px', fontWeight: 800, color: '#1a1a2e' },
  subheading: { margin: '0 0 32px', color: '#999', fontSize: '14px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '13px 16px', borderRadius: '12px', border: '1px solid #e8e8e8', fontSize: '15px', background: '#fafafa', color: '#333', outline: 'none' },
  btnPink: { padding: '14px', borderRadius: '30px', border: 'none', background: '#e91e63', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer', marginTop: '4px' },
  loginText: { marginTop: '24px', textAlign: 'center', color: '#aaa', fontSize: '13px' },
  loginLink: { color: '#e91e63', fontWeight: 700, textDecoration: 'none' },
  cardsWrap: { width: '400px', flexShrink: 0, background: 'linear-gradient(145deg, #fce4ec, #fdf0f5)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardStack: { position: 'relative', width: '220px', height: '300px' },
  card: { position: 'absolute', width: '220px', height: '300px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
  card1: { top: 0, left: 0, zIndex: 3, boxShadow: '0 16px 48px rgba(233,30,99,0.2)' },
  card2: { top: '-10px', left: '18px', zIndex: 2, opacity: 0.7, transform: 'rotate(5deg)' },
  card3: { top: '-18px', left: '32px', zIndex: 1, opacity: 0.45, transform: 'rotate(10deg)' },
  cardImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' },
  dots: { position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '5px', zIndex: 1 },
  dot: { width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,255,255,0.5)' },
  dotActive: { background: '#fff' },
  fallback: { textAlign: 'center' },
};