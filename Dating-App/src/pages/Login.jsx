import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import logoFull from '../lib/LotusConnexs-full.jpeg';
import imgConversation from '../lib/conversation.jpeg';
import imgSongkran from '../lib/songkran.jpeg';
import imgThaifood from '../lib/thaifood.jpeg';

const CONTENT = {
  en: {
    title: 'Thai Dating',
    paragraphs: [
      "Lotus ConneXs is a modern dating platform connecting people from around the world with Thai singles who are genuinely interested in friendship, romance, and real connections. With new members joining every week, there's always someone new to discover in a community inspired by Thailand's warm and welcoming spirit.",
      "Unlike many dating apps, Lotus ConneXs lets you start conversations instantly — no matching required. You can use the platform for free, or upgrade to unlock added features that boost your visibility and improve your chances of getting noticed.",
      "We don't operate like a traditional agency, and we don't handpick or screen every profile. Instead, we focus on giving you access to a wide and active network, offering far more variety than smaller, limited-introduction services.",
      "The platform also supports Thai language, making it easy for local members — even those with limited English — to take part and connect comfortably.",
      "Lotus ConneXs is all about creating a relaxed, open environment where meeting new people feels natural.",
    ],
    cta: "Join now — it's Free",
    ctaPrize: "And enter monthly prize for 2,000 THB",
  },
  th: {
    title: 'หาคู่คนไทย',
    paragraphs: [
      'Lotus ConneXs คือแพลตฟอร์มหาคู่สมัยใหม่ที่เชื่อมต่อผู้คนจากทั่วโลกกับคนไทยที่สนใจมิตรภาพ ความรัก และความสัมพันธ์ที่แท้จริง มีสมาชิกใหม่เข้าร่วมทุกสัปดาห์ เปิดโอกาสให้คุณค้นพบคนใหม่ในชุมชนที่เต็มไปด้วยความอบอุ่นแบบไทย',
      'ต่างจากแอปหาคู่ทั่วไป Lotus ConneXs ให้คุณเริ่มบทสนทนาได้ทันที ไม่ต้องรอการจับคู่ ใช้งานได้ฟรี หรืออัปเกรดเพื่อปลดล็อกฟีเจอร์เพิ่มเติมที่ช่วยเพิ่มการมองเห็นโปรไฟล์ของคุณ',
      'เราไม่ได้ดำเนินการแบบเอเจนซี่แบบดั้งเดิม แต่มุ่งเน้นให้คุณเข้าถึงเครือข่ายที่กว้างและมีความหลากหลายมากกว่าบริการแนะนำรูปแบบจำกัด',
      'แพลตฟอร์มรองรับภาษาไทย ทำให้สมาชิกในประเทศ แม้ผู้ที่ใช้ภาษาอังกฤษได้น้อย สามารถเข้าร่วมและเชื่อมต่อได้อย่างสบายใจ',
      'Lotus ConneXs มุ่งสร้างสภาพแวดล้อมที่ผ่อนคลายและเปิดกว้าง ที่ซึ่งการพบเจอผู้คนใหม่ๆ เป็นเรื่องธรรมชาติและเป็นไปอย่างสนุกสนาน',
    ],
    cta: 'สมัครเลย — ฟรี!',
    ctaPrize: 'ลุ้นรางวัลประจำเดือน 2,000 บาท',
  },
};

// ── User Photo Grid ──────────────────────────────────────────
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

  const fallbackColors = ['#334155','#1e293b','#475569','#64748b','#e91e63','#334155','#1e293b','#475569'];

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
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 20px 16px',
    gap: 14,
  },
  onlineBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 999,
    padding: '6px 16px',
    boxShadow: '0 2px 12px rgba(233,30,99,0.2)',
    marginBottom: 4,
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
    color: '#f1f5f9',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 6,
    width: '100%',
    maxWidth: 360,
    margin: '0 auto',
  },
  cell: {
    position: 'relative',
    aspectRatio: '1/1',
    borderRadius: 12,
    overflow: 'hidden',
    background: '#334155',
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
    background: 'rgba(233,30,99,0.9)',
    color: '#fff',
    fontSize: 10,
    borderRadius: 999,
    padding: '1px 5px',
    fontWeight: 700,
  },
};

// ── useIsMobile hook ─────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// ── Main Login Component ─────────────────────────────────────
export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const navigate  = useNavigate();
  const isMobile  = useIsMobile();
  const { tx, lang } = useTranslation(['auth']);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) navigate('/discover');
    else alert(error.message);
  };

  // Google login — hidden for now, re-enable later
  // const handleGoogleLogin = async () => { ... };

  const c = CONTENT[lang] || CONTENT.en;

  // ── MOBILE LAYOUT ────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* 1. Login Form */}
        <div style={M.section}>
          <img src={logoFull} alt="Lotus ConneXs" style={M.logo} />
          <form onSubmit={handleLogin} style={M.form}>
            <input type="email" placeholder={tx.email || 'Email'} value={email}
              onChange={e => setEmail(e.target.value)} style={M.input} required />
            <input type="password" placeholder={tx.password || 'Password'} value={password}
              onChange={e => setPassword(e.target.value)} style={M.input} required />
            <button type="submit" style={M.btnPink}>{tx.login || 'Log In'}</button>
            <Link to="/forgot-password" style={M.forgotLink}>{tx.forgotPassword || 'Forgot password?'}</Link>
          </form>
          <div style={M.signupRow}>
            <p style={M.signupText}>{tx.noAccount || "Don't have an account?"}</p>
            <Link to="/register" style={M.signupBtn}>{tx.signUpFree || 'Sign Up Free'}</Link>
          </div>
        </div>

        {/* 2. Online Members */}
        <div style={{ background: '#1e293b', borderTop: '1px solid #334155', borderBottom: '1px solid #334155' }}>
          <UserPhotoGrid />
          <div style={M.joinWrap}>
            <Link to="/register" style={M.joinBtn}>
              <span style={M.joinBtnMain}>{c.cta}</span>
              <span style={M.joinBtnPrize}>🎁 {c.ctaPrize}</span>
            </Link>
            <p style={M.joinSubtext}>{tx.noCredit || 'No credit card required • Free to join'}</p>
          </div>
        </div>

        {/* 3. About Section */}
        <div style={M.about}>
          <h2 style={M.aboutTitle}>{c.title}</h2>
          <div style={M.photoGrid}>
            <div style={M.photoCard}><img src={imgConversation} alt="conversation" style={M.photoImg} /></div>
            <div style={M.photoCard}><img src={imgSongkran} alt="songkran" style={M.photoImg} /></div>
            <div style={M.photoCard}><img src={imgThaifood} alt="thai food" style={M.photoImg} /></div>
          </div>
          {c.paragraphs.map((p, i) => (
            <p key={i} style={M.aboutText}>{p}</p>
          ))}
          <div style={M.footerLinks}>
            <a href="#" style={M.footerLink}>Privacy Policy</a>
            <a href="#" style={M.footerLink}>Terms of Service</a>
            <a href="#" style={M.footerLink}>Community Guidelines</a>
            <a href="#" style={M.footerLink}>Contact Us</a>
          </div>
          <p style={M.copyright}>© 2026 Lotus ConneXs. All rights reserved.</p>
        </div>

      </div>
    );
  }

  // ── DESKTOP LAYOUT (เหมือนเดิมทุกอย่าง) ─────────────────
  return (
    <div style={{ background: '#0f172a', position: 'relative', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={S.page}>
        {/* Form side */}
        <div style={S.formWrap}>
          <div style={S.formInner}>
            <img src={logoFull} alt="Lotus ConneXs" style={S.logoBig} />
            <form onSubmit={handleLogin} style={S.form}>
              <input type="email" placeholder={tx.email || 'Email'} value={email}
                onChange={e => setEmail(e.target.value)} style={S.input} required />
              <input type="password" placeholder={tx.password || 'Password'} value={password}
                onChange={e => setPassword(e.target.value)} style={S.input} required />
              <button type="submit" style={S.btnPink}>{tx.login || 'Log In'}</button>
              <Link to="/forgot-password" style={S.forgotLink}>{tx.forgotPassword || 'Forgot password?'}</Link>

              {/* Google login — hidden until fixed */}
              {/* <div style={S.divider}><hr style={S.hr} /><span style={S.orText}>OR</span><hr style={S.hr} /></div>
              <button type="button" onClick={handleGoogleLogin} style={S.btnGoogle}>
                <img src="https://www.google.com/favicon.ico" width="20" alt="google" />
                Continue with Google
              </button> */}
            </form>
            <div style={S.signupRow}>
              <p style={S.signupText}>{tx.noAccount || "Don't have an account?"}</p>
              <Link to="/register" style={S.signupBtn}>{tx.register || 'Sign Up'}</Link>
            </div>
          </div>
        </div>

        {/* Photo grid side */}
        <div style={S.cardsWrap}>
          <UserPhotoGrid />
          <div style={S.joinWrap}>
            <Link to="/register" style={S.joinBtn}>
              <span style={S.joinBtnMain}>{c.cta}</span>
              <span style={S.joinBtnPrize}>🎁 {c.ctaPrize}</span>
            </Link>
            <p style={S.joinSubtext}>{tx.noCredit || 'No credit card required • Free to join'}</p>
          </div>
        </div>
      </div>

      {/* About Section */}
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
          <div style={S.footerLinks}>
            <a href="#" style={S.footerLink}>Privacy Policy</a>
            <a href="#" style={S.footerLink}>Terms of Service</a>
            <a href="#" style={S.footerLink}>Community Guidelines</a>
            <a href="#" style={S.footerLink}>Contact Us</a>
          </div>
          <p style={S.copyright}>© 2026 Lotus ConneXs. All rights reserved.</p>
        </div>
      </div>

    </div>
  );
}

// ── Mobile Styles ────────────────────────────────────────────
const M = {
  section: {
    padding: '40px 24px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: '#0f172a',
  },
  logo: {
    width: '80%',
    maxWidth: 280,
    height: 'auto',
    objectFit: 'contain',
    borderRadius: 12,
    marginBottom: 32,
    boxShadow: '0 6px 24px rgba(233,30,99,0.3)',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16, width: '100%' },
  input: {
    padding: '15px 16px',
    borderRadius: 14,
    border: '1px solid #334155',
    fontSize: 16,
    background: '#1e293b',
    color: '#f1f5f9',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  btnPink: {
    padding: '16px',
    borderRadius: 30,
    border: 'none',
    background: '#e91e63',
    color: '#fff',
    fontWeight: 700,
    fontSize: 17,
    cursor: 'pointer',
  },
  forgotLink: {
    color: '#e91e63',
    fontSize: 14,
    fontWeight: 700,
    textDecoration: 'underline',
    textAlign: 'center',
    padding: '4px 0',
  },
  signupRow: {
    marginTop: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  signupText: { margin: 0, color: '#94a3b8', fontSize: 14 },
  signupBtn: {
    display: 'block',
    width: '100%',
    padding: '15px',
    borderRadius: 30,
    border: '2px solid #e91e63',
    background: 'transparent',
    color: '#e91e63',
    fontWeight: 800,
    fontSize: 16,
    textDecoration: 'none',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  joinWrap: {
    padding: '8px 24px 28px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  joinBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '18px 24px',
    background: 'linear-gradient(135deg, #e91e63, #c2185b)',
    color: '#fff',
    borderRadius: 32,
    textDecoration: 'none',
    boxShadow: '0 10px 32px rgba(233,30,99,0.5)',
    textAlign: 'center',
  },
  joinBtnMain: { color: '#fff', fontWeight: 800, fontSize: 18 },
  joinBtnPrize: { color: '#fde68a', fontWeight: 700, fontSize: 13 },
  joinSubtext: { color: '#94a3b8', fontSize: 12, fontWeight: 600, margin: 0, textAlign: 'center' },
  about: { background: '#0f172a', padding: '40px 20px 40px' },
  aboutTitle: { fontSize: 24, fontWeight: 800, color: '#f1f5f9', textAlign: 'center', marginBottom: 24 },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 },
  photoCard: { borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3', border: '1px solid #334155' },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  aboutText: { fontSize: 15, lineHeight: 1.8, color: '#94a3b8', marginBottom: 16 },
  footerLinks: { display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 28, marginBottom: 12 },
  footerLink: { color: '#e91e63', fontSize: 13, textDecoration: 'none' },
  copyright: { textAlign: 'center', color: '#64748b', fontSize: 12, marginTop: 8 },
};

// ── Desktop Styles (เหมือนเดิมทุกอย่าง) ────────────────────
const S = {
  page: { display: 'flex', minHeight: '100vh', background: '#0f172a' },
  formWrap: { flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '90px 48px 40px', background: '#0f172a' },
  formInner: { width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  logoBig: {
    display: 'block',
    width: '100%',
    height: 'auto',
    objectFit: 'contain',
    margin: '0 auto 48px',
    borderRadius: '14px',
    boxShadow: '0 6px 24px rgba(233,30,99,0.3)',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' },
  input: { padding: '16px 18px', borderRadius: '14px', border: '1px solid #334155', fontSize: '17px', background: '#1e293b', color: '#f1f5f9', outline: 'none' },
  btnPink: { padding: '17px', borderRadius: '30px', border: 'none', background: '#e91e63', color: '#fff', fontWeight: 700, fontSize: '17px', cursor: 'pointer', marginTop: '4px' },
  divider: { display: 'flex', alignItems: 'center', margin: '6px 0' },
  hr: { flex: 1, border: 'none', borderTop: '1px solid #334155' },
  orText: { padding: '0 14px', color: '#64748b', fontSize: '14px' },
  btnGoogle: { padding: '16px', borderRadius: '30px', border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontWeight: 600, fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  signupRow: { marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' },
  signupText: { margin: 0, textAlign: 'center', color: '#94a3b8', fontSize: '15px' },
  signupBtn: {
    display: 'block',
    width: '100%',
    padding: '15px',
    borderRadius: '30px',
    border: '2px solid #e91e63',
    background: 'transparent',
    color: '#e91e63',
    fontWeight: 800,
    fontSize: '16px',
    textDecoration: 'none',
    textAlign: 'center',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  forgotLink: {
    color: '#e91e63',
    fontSize: 15,
    fontWeight: 700,
    textDecoration: 'underline',
    textDecorationThickness: '2px',
    textUnderlineOffset: '4px',
    textAlign: 'center',
    marginTop: 2,
    padding: '8px 0',
    letterSpacing: '0.3px',
  },
  cardsWrap: { width: '460px', flexShrink: 0, background: '#1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '90px 0 40px' },
  joinWrap: { width: '100%', padding: '20px 32px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  joinBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    maxWidth: 380,
    padding: '18px 24px',
    background: 'linear-gradient(135deg, #e91e63, #c2185b)',
    color: '#fff',
    borderRadius: '32px',
    textDecoration: 'none',
    boxShadow: '0 10px 32px rgba(233,30,99,0.5), 0 0 0 1px rgba(233,30,99,0.3)',
    textAlign: 'center',
  },
  joinBtnMain: { color: '#fff', fontWeight: 800, fontSize: '20px', letterSpacing: '0.5px' },
  joinBtnPrize: { color: '#fde68a', fontWeight: 700, fontSize: '13px', letterSpacing: '0.3px' },
  joinSubtext: { color: '#94a3b8', fontSize: 13, fontWeight: 600, margin: 0, textAlign: 'center' },
  about: { background: '#0f172a', borderTop: '1px solid #334155', padding: '60px 20px 40px' },
  aboutInner: { maxWidth: '800px', margin: '0 auto' },
  aboutTitle: { fontSize: '30px', fontWeight: 800, color: '#f1f5f9', textAlign: 'center', marginBottom: '32px' },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' },
  photoCard: { borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', aspectRatio: '4/3', border: '1px solid #334155' },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  aboutText: { fontSize: '17px', lineHeight: '1.9', color: '#94a3b8', marginBottom: '20px' },
  footerLinks: { display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', marginTop: '32px', marginBottom: '16px' },
  footerLink: { color: '#e91e63', fontSize: '14px', textDecoration: 'none' },
  copyright: { textAlign: 'center', color: '#64748b', fontSize: '13px', marginTop: '8px' },
};