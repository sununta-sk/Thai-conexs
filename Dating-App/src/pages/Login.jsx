import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
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

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) navigate('/discover');
    else alert(error.message);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/discover' },
    });
    if (error) alert(error.message);
  };

  const getPhoto = (offset) => photos.length > 0 ? photos[(current + offset) % photos.length] : null;

  return (
    <div style={S.page}>

      {/* ── LEFT: Login Form ── */}
      <div style={S.formWrap}>
        <div style={S.formInner}>
          <h1 style={S.heading}>Thai Conexns</h1>
          <p style={S.subheading}>Find your perfect match ✨</p>

          <form onSubmit={handleLogin} style={S.form}>
            <input type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} style={S.input} required />
            <input type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} style={S.input} required />
            <button type="submit" style={S.btnPink}>Log In</button>
            <div style={S.divider}><hr style={S.hr} /><span style={S.orText}>OR</span><hr style={S.hr} /></div>
            <button type="button" onClick={handleGoogleLogin} style={S.btnGoogle}>
              <img src="https://www.google.com/favicon.ico" width="18" alt="google" />
              Continue with Google
            </button>
          </form>

          <p style={S.signupText}>
            Don't have an account? <Link to="/register" style={S.signupLink}>Sign Up</Link>
          </p>
        </div>
      </div>

      {/* ── RIGHT: Stacked Cards ── */}
      <div style={S.cardsWrap}>
        {photos.length > 0 ? (
          <div style={S.cardStack}>
            {/* card 3 — back */}
            {getPhoto(2) && (
              <div style={{ ...S.card, ...S.card3 }}>
                <img src={getPhoto(2)} alt="" style={S.cardImg} />
              </div>
            )}
            {/* card 2 — middle */}
            {getPhoto(1) && (
              <div style={{ ...S.card, ...S.card2 }}>
                <img src={getPhoto(1)} alt="" style={S.cardImg} />
              </div>
            )}
            {/* card 1 — front */}
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
  page: {
    display: 'flex',
    minHeight: '100vh',
    background: '#fff',
  },

  // ── Form ──────────────────────────────────────────────────────────────────
  formWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 48px',
    background: '#fff',
  },
  formInner: {
    width: '100%',
    maxWidth: '340px',
  },
  heading: {
    margin: '0 0 4px',
    fontSize: '28px',
    fontWeight: 800,
    color: '#1a1a2e',
  },
  subheading: {
    margin: '0 0 32px',
    color: '#999',
    fontSize: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    padding: '13px 16px',
    borderRadius: '12px',
    border: '1px solid #e8e8e8',
    fontSize: '15px',
    background: '#fafafa',
    color: '#333',
    outline: 'none',
  },
  btnPink: {
    padding: '14px',
    borderRadius: '30px',
    border: 'none',
    background: '#e91e63',
    color: '#fff',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer',
    marginTop: '4px',
  },
  divider: { display: 'flex', alignItems: 'center', margin: '4px 0' },
  hr: { flex: 1, border: 'none', borderTop: '1px solid #eee' },
  orText: { padding: '0 12px', color: '#ccc', fontSize: '12px' },
  btnGoogle: {
    padding: '13px',
    borderRadius: '30px',
    border: '1px solid #e8e8e8',
    background: '#fff',
    color: '#555',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  signupText: {
    marginTop: '24px',
    textAlign: 'center',
    color: '#aaa',
    fontSize: '13px',
  },
  signupLink: { color: '#e91e63', fontWeight: 700, textDecoration: 'none' },

  // ── Cards ─────────────────────────────────────────────────────────────────
  cardsWrap: {
    width: '400px',
    flexShrink: 0,
    background: 'linear-gradient(145deg, #fce4ec, #fdf0f5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardStack: {
    position: 'relative',
    width: '220px',
    height: '300px',
  },
  card: {
    position: 'absolute',
    width: '220px',
    height: '300px',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  },
  card1: {
    top: 0, left: 0,
    zIndex: 3,
    boxShadow: '0 16px 48px rgba(233,30,99,0.2)',
  },
  card2: {
    top: '-10px', left: '18px',
    zIndex: 2,
    opacity: 0.7,
    transform: 'rotate(5deg)',
  },
  card3: {
    top: '-18px', left: '32px',
    zIndex: 1,
    opacity: 0.45,
    transform: 'rotate(10deg)',
  },
  cardImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '60px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)',
  },
  dots: {
    position: 'absolute',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '5px',
    zIndex: 1,
  },
  dot: {
    width: '5px', height: '5px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    background: '#fff',
  },
  fallback: {
    textAlign: 'center',
  },
};