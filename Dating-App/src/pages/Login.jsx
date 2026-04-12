import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import logoImg from '../lib/LotusConnexs.jpeg';
import slide1 from '../lib/1.jpeg';
import slide2 from '../lib/2.jpeg';
import slide3 from '../lib/3.jpeg';
import slide4 from '../lib/4.jpeg';
import slide5 from '../lib/5.jpeg';
import slide6 from '../lib/6.jpeg';

const SLIDES = [slide1, slide2, slide3, slide4, slide5, slide6];

export default function Login() {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrent(prev => (prev + 1) % SLIDES.length), 3000);
    return () => clearInterval(timer);
  }, []);

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

  const getPhoto = (offset) => SLIDES[(current + offset) % SLIDES.length];

  return (
    <div style={S.page}>

      {/* ── LEFT: Login Form ── */}
      <div style={S.formWrap}>
        <div style={S.formInner}>
          <img src={logoImg} alt="logo" style={S.logo} />
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
        <div style={S.cardStack}>
          <div style={{ ...S.card, ...S.card3 }}><img src={getPhoto(2)} alt="" style={S.cardImg} /></div>
          <div style={{ ...S.card, ...S.card2 }}><img src={getPhoto(1)} alt="" style={S.cardImg} /></div>
          <div style={{ ...S.card, ...S.card1 }}>
            <img src={getPhoto(0)} alt="" style={S.cardImg} />
            <div style={S.cardGradient} />
            <div style={S.dots}>
              {SLIDES.map((_, i) => (
                <div key={i} onClick={() => setCurrent(i)}
                  style={{ ...S.dot, ...(i === current ? S.dotActive : {}) }} />
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

const S = {
  page: { display: 'flex', minHeight: '100vh', background: '#fff' },
  formWrap: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', background: '#fff' },
  formInner: { width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  logo: { width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 20px rgba(233,30,99,0.25)', marginBottom: '20px' },
  heading: { margin: '0 0 4px', fontSize: '28px', fontWeight: 800, color: '#1a1a2e', textAlign: 'center' },
  subheading: { margin: '0 0 32px', color: '#999', fontSize: '14px', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' },
  input: { padding: '13px 16px', borderRadius: '12px', border: '1px solid #e8e8e8', fontSize: '15px', background: '#fafafa', color: '#333', outline: 'none' },
  btnPink: { padding: '14px', borderRadius: '30px', border: 'none', background: '#e91e63', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer', marginTop: '4px' },
  divider: { display: 'flex', alignItems: 'center', margin: '4px 0' },
  hr: { flex: 1, border: 'none', borderTop: '1px solid #eee' },
  orText: { padding: '0 12px', color: '#ccc', fontSize: '12px' },
  btnGoogle: { padding: '13px', borderRadius: '30px', border: '1px solid #e8e8e8', background: '#fff', color: '#555', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  signupText: { marginTop: '24px', textAlign: 'center', color: '#aaa', fontSize: '13px' },
  signupLink: { color: '#e91e63', fontWeight: 700, textDecoration: 'none' },
  cardsWrap: { width: '400px', flexShrink: 0, background: 'linear-gradient(145deg, #fce4ec, #fdf0f5)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardStack: { position: 'relative', width: '220px', height: '300px' },
  card: { position: 'absolute', width: '220px', height: '300px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
  card1: { top: 0, left: 0, zIndex: 3, boxShadow: '0 16px 48px rgba(233,30,99,0.2)' },
  card2: { top: '-10px', left: '18px', zIndex: 2, opacity: 0.7, transform: 'rotate(5deg)' },
  card3: { top: '-18px', left: '32px', zIndex: 1, opacity: 0.45, transform: 'rotate(10deg)' },
  cardImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' },
  dots: { position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '5px', zIndex: 1, cursor: 'pointer' },
  dot: { width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,255,255,0.5)' },
  dotActive: { background: '#fff' },
};