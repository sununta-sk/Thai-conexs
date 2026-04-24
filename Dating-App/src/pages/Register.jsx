import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import logoImg from '../lib/LotusConnexs.jpeg';
import slide1 from '../lib/1.jpeg';
import slide2 from '../lib/2.jpeg';
import slide3 from '../lib/3.jpeg';
import slide4 from '../lib/4.jpeg';
import slide5 from '../lib/5.jpeg';
import slide6 from '../lib/6.jpeg';

const SLIDES = [slide1, slide2, slide3, slide4, slide5, slide6];

export default function Register() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [current, setCurrent]   = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrent(prev => (prev + 1) % SLIDES.length), 3000);
    return () => clearInterval(timer);
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirm) { alert('Passwords do not match'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) alert(error.message);
    else { alert('Registration successful! Please check your email.'); navigate('/login'); }
  };

  const getPhoto = (offset) => SLIDES[(current + offset) % SLIDES.length];

  return (
    <div style={S.page}>

      {/* ── LEFT: Register Form ── */}
      <div style={S.formWrap}>
        <div style={S.formInner}>
          <img src={logoImg} alt="logo" style={S.logo} />
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
  page: { display: 'flex', minHeight: '100vh', background: '#0f172a' },
  formWrap: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', background: '#0f172a' },
  formInner: { width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  logo: { width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 20px rgba(233,30,99,0.4)', marginBottom: '20px' },
  heading: { margin: '0 0 4px', fontSize: '28px', fontWeight: 800, color: '#f1f5f9', textAlign: 'center' },
  subheading: { margin: '0 0 32px', color: '#94a3b8', fontSize: '14px', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' },
  input: { padding: '13px 16px', borderRadius: '12px', border: '1px solid #334155', fontSize: '15px', background: '#1e293b', color: '#f1f5f9', outline: 'none' },
  btnPink: { padding: '14px', borderRadius: '30px', border: 'none', background: '#e91e63', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer', marginTop: '4px' },
  loginText: { marginTop: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' },
  loginLink: { color: '#e91e63', fontWeight: 700, textDecoration: 'none' },
  cardsWrap: { width: '400px', flexShrink: 0, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardStack: { position: 'relative', width: '220px', height: '300px' },
  card: { position: 'absolute', width: '220px', height: '300px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' },
  card1: { top: 0, left: 0, zIndex: 3, boxShadow: '0 16px 48px rgba(233,30,99,0.3)' },
  card2: { top: '-10px', left: '18px', zIndex: 2, opacity: 0.7, transform: 'rotate(5deg)' },
  card3: { top: '-18px', left: '32px', zIndex: 1, opacity: 0.45, transform: 'rotate(10deg)' },
  cardImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' },
  dots: { position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '5px', zIndex: 1, cursor: 'pointer' },
  dot: { width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,255,255,0.5)' },
  dotActive: { background: '#fff' },
};