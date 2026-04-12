import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photos, setPhotos] = useState([]);
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('profiles').select('avatar_url')
      .not('avatar_url', 'is', null).neq('avatar_url', '').limit(20)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPhotos([...data].sort(() => Math.random() - 0.5).map(p => p.avatar_url));
        }
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
    conpython3 -c "
content = open('/dev/stdin').read()
open('src/pages/Login.jsx', 'w').write(content)
" << 'EOF'
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photos, setPhotos] = useState([]);
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('profiles').select('avatar_url')
      .not('avatar_url', 'is', null).neq('avatar_url', '').limit(20)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPhotos([...data].sort(() => Math.random() - 0.5).map(p => p.avatar_url));
        }
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

  return (
    <div style={S.page}>
      <div style={S.slideWrap}>
        <div style={S.slideOverlay} />
        {photos.length > 0 ? photos.map((url, i) => (
          <img key={url} src={url} alt="" style={{ ...S.slideImg, opacity: i === current ? 1 : 0, transition: 'opacity 0.8s ease-in-out' }} />
        )) : <div style={S.slideFallback} />}
        {photos.length > 1 && (
          <div style={S.dots}>
            {photos.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} style={{ ...S.dot, ...(i === current ? S.dotActive : {}) }} />
            ))}
          </div>
        )}
        <div style={S.branding}>
          <div style={S.brandTitle}>Thai Conexns</div>
          <div style={S.brandSub}>Find your perfect match today</div>
        </div>
      </div>
      <div style={S.formWrap}>
        <div style={S.formInner}>
          <h1 style={S.heading}>Welcome back</h1>
          <p style={S.subheading}>Sign in to continue</p>
          <form onSubmit={handleLogin} style={S.form}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={S.input} required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={S.input} required />
            <button type="submit" style={S.btnPink}>Log In</button>
            <div style={S.divider}><hr style={S.hr} /><span style={S.orText}>OR</span><hr style={S.hr} /></div>
            <button type="button" onClick={handleGoogleLogin} style={S.btnGoogle}>
              <img src="https://www.google.com/favicon.ico" width="20" alt="google" />
              Continue with Google
            </button>
          </form>
          <p style={S.signupText}>
            Don't have an account? <Link to="/register" style={S.signupLink}>Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const S = {
  page: { display: 'flex', minHeight: '100vh', background: '#fff' },
  slideWrap: { flex: 1, position: 'relative', overflow: 'hidden', background: '#1a1a2e', display: 'flex', minWidth: 0 },
  slideImg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  slideFallback: { position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #e91e6388 0%, #1a1a2e 100%)' },
  slideOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)', zIndex: 1 },
  branding: { position: 'absolute', bottom: '48px', left: '40px', zIndex: 2 },
  brandTitle: { color: '#fff', fontSize: '32px', fontWeight: 800, textShadow: '0 2px 12px rgba(0,0,0,0.4)' },
  brandSub: { color: 'rgba(255,255,255,0.8)', fontSize: '15px', marginTop: '6px' },
  dots: { position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 2 },
  dot: { width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', padding: 0 },
  dotActive: { background: '#fff', transform: 'scale(1.3)' },
  formWrap: { width: '440px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', background: '#fff' },
  formInner: { width: '100%', maxWidth: '360px' },
  heading: { margin: '0 0 6px', fontSize: '28px', fontWeight: 700, color: '#1a1a2e' },
  subheading: { margin: '0 0 32px', color: '#888', fontSize: '15px' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  input: { padding: '14px 16px', borderRadius: '12px', border: '1px solid #e0e0e0', fontSize: '15px', background: '#fafafa', color: '#333', outline: 'none' },
  btnPink: { padding: '15px', borderRadius: '30px', border: 'none', background: '#e91e63', color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer', marginTop: '4px' },
  divider: { display: 'flex', alignItems: 'center', margin: '4px 0' },
  hr: { flex: 1, border: 'none', borderTop: '1px solid #eee' },
  orText: { padding: '0 12px', color: '#bbb', fontSize: '12px' },
  btnGoogle: { padding: '14px', borderRadius: '30px', border: '1px solid #e0e0e0', background: '#fff', color: '#444', fontWeight: 600, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  signupText: { marginTop: '28px', textAlign: 'center', color: '#888', fontSize: '14px' },
  signupLink: { color: '#e91e63', fontWeight: 700, textDecoration: 'none' },
};
