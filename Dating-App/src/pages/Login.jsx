import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import logoImg from '../lib/LotusConnexs.jpeg';
import imgConversation from '../lib/conversation.jpeg';
import imgSongkran from '../lib/songkran.jpeg';
import imgThaifood from '../lib/thaifood.jpeg';

const CONTENT = {
  en: {
    title: 'Thai Dating',
    paragraphs: [
      "Lotus ConeXs is a modern dating platform connecting people from around the world with Thai singles who are genuinely interested in friendship, romance, and real connections. With new members joining every week, there's always someone new to discover in a community inspired by Thailand's warm and welcoming spirit.",
      "Unlike many dating apps, Lotus ConeXs lets you start conversations instantly — no matching required. You can use the platform for free, or upgrade to unlock added features that boost your visibility and improve your chances of getting noticed.",
      "We don't operate like a traditional agency, and we don't handpick or screen every profile. Instead, we focus on giving you access to a wide and active network, offering far more variety than smaller, limited-introduction services.",
      "The platform also supports Thai language, making it easy for local members — even those with limited English — to take part and connect comfortably.",
      "Lotus ConeXs is all about creating a relaxed, open environment where meeting new people feels natural.",
    ],
    cta: "Join Lotus ConeXs — It's Free",
  },
  th: {
    title: 'หาคู่คนไทย',
    paragraphs: [
      'Lotus ConeXs คือแพลตฟอร์มหาคู่สมัยใหม่ที่เชื่อมต่อผู้คนจากทั่วโลกกับคนไทยที่สนใจมิตรภาพ ความรัก และความสัมพันธ์ที่แท้จริง มีสมาชิกใหม่เข้าร่วมทุกสัปดาห์ เปิดโอกาสให้คุณค้นพบคนใหม่ในชุมชนที่เต็มไปด้วยความอบอุ่นแบบไทย',
      'ต่างจากแอปหาคู่ทั่วไป Lotus ConeXs ให้คุณเริ่มบทสนทนาได้ทันที ไม่ต้องรอการจับคู่ ใช้งานได้ฟรี หรืออัปเกรดเพื่อปลดล็อกฟีเจอร์เพิ่มเติมที่ช่วยเพิ่มการมองเห็นโปรไฟล์ของคุณ',
      'เราไม่ได้ดำเนินการแบบเอเจนซี่แบบดั้งเดิม แต่มุ่งเน้นให้คุณเข้าถึงเครือข่ายที่กว้างและมีความหลากหลายมากกว่าบริการแนะนำรูปแบบจำกัด',
      'แพลตฟอร์มรองรับภาษาไทย ทำให้สมาชิกในประเทศ แม้ผู้ที่ใช้ภาษาอังกฤษได้น้อย สามารถเข้าร่วมและเชื่อมต่อได้อย่างสบายใจ',
      'Lotus ConeXs มุ่งสร้างสภาพแวดล้อมที่ผ่อนคลายและเปิดกว้าง ที่ซึ่งการพบเจอผู้คนใหม่ๆ เป็นเรื่องธรรมชาติและเป็นไปอย่างสนุกสนาน',
    ],
    cta: 'เข้าร่วม Lotus ConeXs — ฟรี!',
  },
};

// ── User Photo Grid (แทน card stack) ──────────────────────────
function UserPhotoGrid() {
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, username, avatar_url, details')
      .not('avatar_url', 'is', null)
      .limit(20)
      .then(({ data }) => {
        if (data) setProfiles(data.filter(p => p.avatar_url));
      });
  }, []);

  // fallback ถ้าไม่มี user
  const fallbackColors = ['#fce4ec','#f8bbd0','#f48fb1','#f06292','#e91e63','#fce4ec','#fdf0f5','#fce4ec'];

  return (
    <div style={G.wrap}>
      <div style={G.onlineBanner}>
        <span style={G.onlineDot} />
        <span style={G.onlineText}>
          {profiles.length > 0 ? `${profiles.length}+ members online now` : 'Join thousands of members'}
        </span>
      </div>
      <div style={G.grid}>
        {profiles.length > 0 ? (
          profiles.slice(0, 16).map((p, i) => (
            <div key={p.id} style={G.cell}>
              <img
                src={p.avatar_url}
                alt={p.username}
                style={G.img}
                onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.style.background = fallbackColors[i % fallbackColors.length]; }}
              />
              {p.details?.gender && (
                <div style={G.badge}>{p.details.gender === 'female' || p.details.gender === 'หญิง' ? '♀' : '♂'}</div>
              )}
            </div>
          ))
        ) : (
          // fallback placeholder cells
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ ...G.cell, background: fallbackColors[i % fallbackColors.length] }} />
          ))
        )}
      </div>
    </div>
  );
}

const G = {
  wrap: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 16px',
    gap: 12,
  },
  onlineBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#fff',
    borderRadius: 999,
    padding: '6px 16px',
    boxShadow: '0 2px 12px rgba(233,30,99,0.12)',
    marginBottom: 8,
  },
  onlineDot: {
    display: 'inline-block',
    width: 9, height: 9,
    borderRadius: '50%',
    background: '#4caf50',
    flexShrink: 0,
  },
  onlineText: {
    fontSize: 13,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 6,
    width: '100%',
    maxWidth: 360,
  },
  cell: {
    position: 'relative',
    aspectRatio: '1/1',
    borderRadius: 12,
    overflow: 'hidden',
    background: '#fce4ec',
  },
  img: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  badge: {
    position: 'absolute',
    bottom: 4, right: 4,
    background: 'rgba(233,30,99,0.85)',
    color: '#fff',
    fontSize: 10,
    borderRadius: 999,
    padding: '1px 5px',
    fontWeight: 700,
  },
};

// ── Main Login Component ───────────────────────────────────────
export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [lang, setLang]         = useState('en');
  const navigate = useNavigate();

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

  const c = CONTENT[lang];

  return (
    <div style={{ background: '#fff', position: 'relative' }}>

      {/* Language Toggle */}
      <div style={S.langToggle}>
        <button onClick={() => setLang('en')} style={{ ...S.flagBtn, opacity: lang === 'en' ? 1 : 0.35 }}>🇬🇧</button>
        <button onClick={() => setLang('th')} style={{ ...S.flagBtn, opacity: lang === 'th' ? 1 : 0.35 }}>🇹🇭</button>
      </div>

      {/* Hero */}
      <div style={S.page}>
        {/* Form side */}
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
                <img src="https://www.google.com/favicon.ico" width="20" alt="google" />
                Continue with Google
              </button>
            </form>
            <p style={S.signupText}>
              Don't have an account? <Link to="/register" style={S.signupLink}>Sign Up</Link>
            </p>
          </div>
        </div>

        {/* Photo grid side — แทน card stack */}
        <div style={S.cardsWrap}>
          <UserPhotoGrid />
        </div>
      </div>

      {/* About Section — ไม่แตะ */}
      <div style={S.about}>
        <div style={S.aboutInner}>
          <h2 style={S.aboutTitle}>{c.title}</h2>

          <div style={S.photoGrid}>
            <div style={S.photoCard}><img src={imgConversation} alt="conversation" style={S.photoImg} /></div>
            <div style={S.photoCard}><img src={imgSongkran} alt="songkran" style={S.photoImg} /></div>
            <div style={S.photoCard}><img src={imgThaifood} alt="thai food" style={S.photoImg} /></div>
          </div>

          {c.paragraphs.map((p, i) => (
            <p key={i} style={S.aboutText}>{p}</p>
          ))}

          <div style={{ textAlign: 'center', margin: '40px 0 32px' }}>
            <Link to="/register" style={S.ctaBtn}>{c.cta}</Link>
          </div>

          <div style={S.footerLinks}>
            <a href="#" style={S.footerLink}>Privacy Policy</a>
            <a href="#" style={S.footerLink}>Terms of Service</a>
            <a href="#" style={S.footerLink}>Community Guidelines</a>
            <a href="#" style={S.footerLink}>Contact Us</a>
          </div>
          <p style={S.copyright}>© 2025 Lotus ConeXs. All rights reserved.</p>
        </div>
      </div>

    </div>
  );
}

const S = {
  langToggle: { position: 'fixed', top: '16px', right: '16px', display: 'flex', gap: '6px', zIndex: 100 },
  flagBtn: { background: 'none', border: 'none', fontSize: '26px', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'opacity 0.2s' },
  page: { display: 'flex', minHeight: '100vh', background: '#fff' },
  formWrap: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', background: '#fff' },
  formInner: { width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  logo: { width: '130px', height: '130px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 20px rgba(233,30,99,0.25)', marginBottom: '20px' },
  heading: { margin: '0 0 6px', fontSize: '32px', fontWeight: 800, color: '#1a1a2e', textAlign: 'center' },
  subheading: { margin: '0 0 32px', color: '#999', fontSize: '16px', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' },
  input: { padding: '16px 18px', borderRadius: '14px', border: '1px solid #e8e8e8', fontSize: '17px', background: '#fafafa', color: '#333', outline: 'none' },
  btnPink: { padding: '17px', borderRadius: '30px', border: 'none', background: '#e91e63', color: '#fff', fontWeight: 700, fontSize: '17px', cursor: 'pointer', marginTop: '4px' },
  divider: { display: 'flex', alignItems: 'center', margin: '6px 0' },
  hr: { flex: 1, border: 'none', borderTop: '1px solid #eee' },
  orText: { padding: '0 14px', color: '#ccc', fontSize: '14px' },
  btnGoogle: { padding: '16px', borderRadius: '30px', border: '1px solid #e8e8e8', background: '#fff', color: '#555', fontWeight: 600, fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  signupText: { marginTop: '24px', textAlign: 'center', color: '#aaa', fontSize: '15px' },
  signupLink: { color: '#e91e63', fontWeight: 700, textDecoration: 'none' },
  cardsWrap: { width: '420px', flexShrink: 0, background: 'linear-gradient(145deg, #fce4ec, #fdf0f5)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  about: { background: 'linear-gradient(145deg, #fce4ec, #fdf0f5)', borderTop: '1px solid #f8bbd0', padding: '60px 20px 40px' },
  aboutInner: { maxWidth: '800px', margin: '0 auto' },
  aboutTitle: { fontSize: '30px', fontWeight: 800, color: '#1a1a2e', textAlign: 'center', marginBottom: '32px' },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' },
  photoCard: { borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(233,30,99,0.12)', aspectRatio: '4/3' },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  aboutText: { fontSize: '17px', lineHeight: '1.9', color: '#555', marginBottom: '20px' },
  ctaBtn: { display: 'inline-block', padding: '20px 56px', background: 'linear-gradient(135deg, #e91e63, #c2185b)', color: '#fff', fontWeight: 800, fontSize: '18px', borderRadius: '50px', textDecoration: 'none', boxShadow: '0 8px 28px rgba(233,30,99,0.35)', letterSpacing: '0.5px' },
  footerLinks: { display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', marginTop: '32px', marginBottom: '16px' },
  footerLink: { color: '#e91e63', fontSize: '14px', textDecoration: 'none' },
  copyright: { textAlign: 'center', color: '#999', fontSize: '13px', marginTop: '8px' },
};