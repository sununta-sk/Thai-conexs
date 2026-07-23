import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
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
function UserPhotoGrid({ isMobile }) {
  const [profiles, setProfiles] = useState([]); const cols = isMobile ? 4 : 8; const total = isMobile ? 16 : 32;

  useEffect(() => {
    let active = true;
    const fetchProfiles = () => {
      supabase
        .from('profiles')
        .select('id, username, avatar_url, details')
        .not('avatar_url', 'is', null)
        .neq('avatar_url', '')
        .limit(40)
        .then(({ data }) => {
          if (!active || !data) return;
          const filtered = data.filter(p => p.avatar_url);
          for (let i = filtered.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
          }
          setProfiles(filtered);
        });
    };
    fetchProfiles();
    const interval = setInterval(fetchProfiles, 45000);
    return () => { active = false; clearInterval(interval); };
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
      <div style={{ ...G.grid, gridTemplateColumns: 'repeat(' + cols + ', 1fr)', maxWidth: isMobile ? 360 : 900 }}>
        {profiles.length > 0 ? (
          Array.from({ length: total }).map((_, i) => {
            const p = profiles[i];
            if (!p) {
              return <div key={`empty-${i}`} style={{ ...G.cell, background: fallbackColors[i % fallbackColors.length] }} />;
            }
            return (
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
            );
          })
        ) : (
          Array.from({ length: isMobile ? 12 : 24 }).map((_, i) => (
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
const HERO_TEXT_EN = [
  "Lotus ConneXs is Thailand's newest dating platform with people from all over the Kingdom looking to connect with foreign friends.",
  "Our aim is to have this site free for Thai women and the Thai LGBT community.",
  "Join now and start your search today!",
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// ── Main Register Component ───────────────────────────────────
function LanguageToggle({ lang, setLang }) {
  return (
    <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 0, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, overflow: 'hidden', zIndex: 20 }}>
      <button type="button" onClick={() => setLang('en')} style={{ padding: '6px 10px', background: lang === 'en' ? '#e91e63' : 'transparent', border: 'none', cursor: 'pointer', color: lang === 'en' ? '#fff' : '#94a3b8', fontSize: 12, fontWeight: 700 }}>EN</button>
      <button type="button" onClick={() => setLang('th')} style={{ padding: '6px 10px', background: lang === 'th' ? '#e91e63' : 'transparent', border: 'none', cursor: 'pointer', color: lang === 'th' ? '#fff' : '#94a3b8', fontSize: 12, fontWeight: 700 }}>TH</button>
    </div>
  );
}

export default function Register() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();
  const isMobile  = useIsMobile();

  const { tx, lang, setLang } = useTranslation(['auth']);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirm) { alert(tx.passwordsMustMatch || 'Passwords do not match'); return; }
    if (password.length < 6) { alert(tx.passwordTooShort || 'Password must be at least 6 characters'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + '/profile-setup',
      },
    });
    setLoading(false);
    if (error) { alert(error.message); return; }
    navigate('/profile-setup');
  };

  const c = CONTENT[lang] || CONTENT.en;

  // ── MOBILE LAYOUT ────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* 1. Register Form */}
        <div style={{ ...M.section, position: 'relative' }}>
          <LanguageToggle lang={lang} setLang={setLang} />
          <img src={logoFull} alt="Lotus ConneXs" style={M.logo} />
          <div style={M.heroText}>
            <p style={M.heroLine}>{HERO_TEXT_EN[0]}</p>
            <p style={M.heroLine}>{HERO_TEXT_EN[1]}</p>
            <p style={M.heroLineBold}>{HERO_TEXT_EN[2]}</p>
          </div>
          <form onSubmit={handleRegister} style={M.form}>
            <input type="email" placeholder={tx.email || 'Email'} value={email}
              onChange={e => setEmail(e.target.value)} style={M.input} required />
            <input type="password" placeholder={tx.passwordMin || 'Password (min 6 chars)'} value={password}
              onChange={e => setPassword(e.target.value)} style={M.input} required minLength={6} />
            <input type="password" placeholder={tx.confirmPassword || 'Confirm Password'} value={confirm}
              onChange={e => setConfirm(e.target.value)} style={M.input} required />
            <button type="submit" disabled={loading} style={{ ...M.btnPink, opacity: loading ? 0.7 : 1 }}>
              {loading ? '...' : (tx.register || 'Sign Up')}
            </button>
          </form>
          <div style={M.loginRow}>
            <p style={M.loginText}>{tx.hasAccount || 'Already have an account?'}</p>
            <Link to="/login" style={M.loginBtn}>{tx.login || 'Log In'}</Link>
          </div>
        </div>

        {/* 2. Online Members */}
        <div style={{ background: '#1e293b', borderTop: '1px solid #334155', borderBottom: '1px solid #334155' }}>
          <UserPhotoGrid isMobile={isMobile} />
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
        <div style={{ ...S.formWrap, position: 'relative', flexDirection: 'column', alignItems: 'center' }}>
          <LanguageToggle lang={lang} setLang={setLang} />
          <img src={logoFull} alt="Lotus ConneXs" style={S.logoBig} />
          <div style={S.formInner}>
            <div style={S.heroText}>
              <p style={S.heroLine}>{HERO_TEXT_EN[0]}</p>
              <p style={S.heroLine}>{HERO_TEXT_EN[1]}</p>
              <p style={S.heroLineBold}>{HERO_TEXT_EN[2]}</p>
            </div>
            <form onSubmit={handleRegister} style={S.form}>
              <input type="email" placeholder={tx.email || 'Email'} value={email}
                onChange={e => setEmail(e.target.value)} style={S.input} required />
              <input type="password" placeholder={tx.passwordMin || 'Password (min 6 chars)'} value={password}
                onChange={e => setPassword(e.target.value)} style={S.input} required minLength={6} />
              <input type="password" placeholder={tx.confirmPassword || 'Confirm Password'} value={confirm}
                onChange={e => setConfirm(e.target.value)} style={S.input} required />
              <button type="submit" disabled={loading} style={{ ...S.btnPink, opacity: loading ? 0.7 : 1 }}>
                {loading ? '...' : (tx.register || 'Sign Up')}
              </button>
            </form>
            <div style={S.loginRow}>
              <p style={S.loginText}>{tx.hasAccount || 'Already have an account?'}</p>
              <Link to="/login" style={S.loginBtn}>{tx.login || 'Log In'}</Link>
            </div>
          </div>
        </div>

        {/* Photo grid side + BIG Join button under it */}
        <div style={S.cardsWrap}>
          <UserPhotoGrid isMobile={isMobile} />

          {/* Big Join CTA — same as Login but redirects to top of form */}
          <div style={S.joinWrap}>
            <Link to="/register" style={S.joinBtn}>
              <span style={S.joinBtnMain}>{c.cta}</span>
              <span style={S.joinBtnPrize}>🎁 {c.ctaPrize}</span>
            </Link>
            <p style={S.joinSubtext}>
              {tx.noCredit || 'No credit card required • Free to join'}
            </p>
          </div>
        </div>
      </div>

      {/* About Section — dark theme */}
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
  heroText: { textAlign: 'center', marginBottom: 24, width: '100%' },
  heroLine: { color: '#cbd5e1', fontSize: 14, lineHeight: 1.6, margin: '0 0 8px' },
  heroLineBold: { color: '#e91e63', fontWeight: 700, fontSize: 14, margin: 0 },
  section: { padding: '40px 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0f172a' },
  logo: { width: '80%', maxWidth: 280, height: 'auto', objectFit: 'contain', borderRadius: 12, marginBottom: 32, boxShadow: '0 6px 24px rgba(233,30,99,0.3)' },
  form: { display: 'flex', flexDirection: 'column', gap: 16, width: '100%' },
  input: { padding: '15px 16px', borderRadius: 14, border: '1px solid #334155', fontSize: 16, background: '#1e293b', color: '#f1f5f9', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btnPink: { padding: '16px', borderRadius: 30, border: 'none', background: '#e91e63', color: '#fff', fontWeight: 700, fontSize: 17, cursor: 'pointer' },
  loginRow: { marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' },
  loginText: { margin: 0, color: '#94a3b8', fontSize: 14 },
  loginBtn: { display: 'block', width: '100%', padding: '15px', borderRadius: 30, border: '2px solid #e91e63', background: 'transparent', color: '#e91e63', fontWeight: 800, fontSize: 16, textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' },
  joinWrap: { padding: '8px 24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  joinBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%', padding: '18px 24px', background: 'linear-gradient(135deg, #e91e63, #c2185b)', color: '#fff', borderRadius: 32, textDecoration: 'none', boxShadow: '0 10px 32px rgba(233,30,99,0.5)', textAlign: 'center' },
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

const S = {
  heroText: { textAlign: 'center', marginBottom: 28, width: '100%', maxWidth: 440 },
  heroLine: { color: '#cbd5e1', fontSize: 17, lineHeight: 1.8, margin: '0 0 12px' },
  heroLineBold: { color: '#e91e63', fontWeight: 700, fontSize: 18, margin: 0 },
  page: { display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', background: '#0f172a' },
  formWrap: { width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '90px 48px 40px', background: '#0f172a', boxSizing: 'border-box' },
  formInner: { width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#1e293b', borderRadius: '24px', padding: '40px 36px', boxShadow: '0 12px 40px rgba(0,0,0,0.35)', boxSizing: 'border-box' },
  logoBig: {
    display: 'block',
    width: '100%',
    maxWidth: '460px',
    height: 'auto',
    objectFit: 'contain',
    margin: '0 auto 48px',
    borderRadius: '14px',
    boxShadow: '0 6px 24px rgba(233,30,99,0.3)',
  },
  heading: { margin: '0 0 6px', fontSize: '32px', fontWeight: 800, color: '#f1f5f9', textAlign: 'center' },
  subheading: { margin: '0 0 28px', color: '#94a3b8', fontSize: '16px', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '28px', width: '100%', maxWidth: '460px' },
  input: { padding: '16px 18px', borderRadius: '14px', border: '1px solid #334155', fontSize: '17px', background: '#1e293b', color: '#f1f5f9', outline: 'none' },
  btnPink: { padding: '17px', borderRadius: '30px', border: 'none', background: '#e91e63', color: '#fff', fontWeight: 700, fontSize: '17px', cursor: 'pointer', marginTop: '4px' },
  loginRow: { marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '460px' },
  loginText: { margin: 0, textAlign: 'center', color: '#94a3b8', fontSize: '15px' },
  loginBtn: {
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
    transition: 'all 0.15s',
  },

  cardsWrap: { width: '100%', maxWidth: '900px', background: '#1e293b', borderRadius: '24px', boxShadow: '0 12px 40px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '40px 32px', margin: '32px 20px 0', boxSizing: 'border-box' },

  joinWrap: { width: '100%', maxWidth: '460px', padding: '20px 32px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, boxSizing: 'border-box' },
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
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  joinBtnMain: {
    color: '#fff',
    fontWeight: 800,
    fontSize: '20px',
    letterSpacing: '0.5px',
  },
  joinBtnPrize: {
    color: '#fde68a',
    fontWeight: 700,
    fontSize: '13px',
    letterSpacing: '0.3px',
  },
  joinSubtext: { color: '#94a3b8', fontSize: 13, fontWeight: 600, margin: 0, textAlign: 'center' },

  about: { width: '100%', display: 'flex', justifyContent: 'center', padding: '32px 20px 60px', boxSizing: 'border-box' },
  aboutInner: { width: '100%', maxWidth: '900px', margin: '0 auto', background: '#1e293b', borderRadius: '24px', boxShadow: '0 12px 40px rgba(0,0,0,0.35)', padding: '48px 40px', boxSizing: 'border-box' },
  aboutTitle: { fontSize: '30px', fontWeight: 800, color: '#f1f5f9', textAlign: 'center', marginBottom: '32px' },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' },
  photoCard: { borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', aspectRatio: '4/3', border: '1px solid #334155' },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  aboutText: { fontSize: '17px', lineHeight: '1.9', color: '#94a3b8', marginBottom: '20px' },
  footerLinks: { display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', marginTop: '32px', marginBottom: '16px' },
  footerLink: { color: '#e91e63', fontSize: '14px', textDecoration: 'none' },
  copyright: { textAlign: 'center', color: '#64748b', fontSize: '13px', marginTop: '8px' },
};
