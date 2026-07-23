import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import logoFull from '../lib/LotusConnexs-full.jpeg';
import imgConversation from '../lib/conversation.jpeg';
import imgSongkran from '../lib/songkran.jpeg';
import imgThaifood from '../lib/thaifood.jpeg';

const CONTENT = {
  en: {
    title: 'Thai Dating',
    paragraphs: [
      "Lotus ConneXs is a modern dating platform connecting people from around the world with Thai singles who are genuinely interested in friendship, romance, and real connections. With new members joining every week, there's always someone new to discover in a community inspired by Thailand's warm and welcoming spirit.",
      "Unlike many dating apps, Lotus ConneXs lets you start conversations instantly no matching required. You can use the platform for free, or upgrade to unlock added features that boost your visibility and improve your chances of getting noticed.",
      "We don't operate like a traditional agency, and we don't handpick or screen every profile. Instead, we focus on giving you access to a wide and active network, offering far more variety than smaller, limited introduction services.",
      "The platform also supports Thai language, making it easy for local members even those with limited English to take part and connect comfortably.",
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
const HERO_TEXT_EN = [
  "Lotus ConneXs is Thailand's newest dating platform with people from all over the Kingdom looking to connect with foreign friends. Our aim is to have this site free for Thai women and the Thai LGBT community.",
  "Join now and start your search today!",
];

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
      <div style={{ ...G.grid, gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: isMobile ? 360 : 900 }}>
        {profiles.length > 0 ? (
          profiles.slice(0, total).map((p, i) => (
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
          )).concat(
            Array.from({ length: Math.max(0, total - Math.min(profiles.length, total)) }).map((_, i) => (
              <div key={`empty-${i}`} style={{ ...G.cell, background: fallbackColors[i % fallbackColors.length] }} />
            ))
          )
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
function LanguageToggle({ lang, setLang }) {
  return (
    <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 0, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, overflow: 'hidden', zIndex: 20 }}>
      <button type="button" onClick={() => setLang('en')} style={{ padding: '6px 10px', background: lang === 'en' ? '#e91e63' : 'transparent', border: 'none', cursor: 'pointer', color: lang === 'en' ? '#fff' : '#94a3b8', fontSize: 12, fontWeight: 700 }}>EN</button>
      <button type="button" onClick={() => setLang('th')} style={{ padding: '6px 10px', background: lang === 'th' ? '#e91e63' : 'transparent', border: 'none', cursor: 'pointer', color: lang === 'th' ? '#fff' : '#94a3b8', fontSize: 12, fontWeight: 700 }}>TH</button>
    </div>
  );
}

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const navigate  = useNavigate();
  const isMobile  = useIsMobile();
  const { tx, lang, setLang } = useTranslation(['auth']);

  const [checkingSession, setCheckingSession] = useState(true);
  const [returningUser, setReturningUser] = useState(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const session = data?.session;
      if (session) {
        let cachedAvatar = null, cachedUsername = null;
        try {
          cachedAvatar = localStorage.getItem('cached_avatar_url');
          cachedUsername = localStorage.getItem('cached_username');
        } catch {}
        if (cachedAvatar || cachedUsername) {
          setReturningUser({ avatar_url: cachedAvatar, username: cachedUsername || '' });
        }
      }
      setCheckingSession(false);
    });
    return () => { active = false; };
  }, []);

  const handleContinueSession = () => navigate('/discover');
  const handleUseDifferentAccount = () => setReturningUser(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) navigate('/discover');
    else alert(error.message);
  };

  const handleGoogleLogin = async () => {
    if (Capacitor.isNativePlatform()) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'com.lotusconnexs.app://login-callback',
          skipBrowserRedirect: true,
        },
      });
      if (error) { alert(error.message); return; }
      if (data?.url) await Browser.open({ url: data.url });
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/discover' },
      });
      if (error) alert(error.message);
    }
  };

  const c = CONTENT[lang] || CONTENT.en;

  if (checkingSession) {
    return <div style={{ background: '#0f172a', minHeight: '100vh' }} />;
  }

  // ── MOBILE LAYOUT ────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* 1. Login Form */}
        <div style={{ ...M.section, position: 'relative' }}>
          <LanguageToggle lang={lang} setLang={setLang} />
          <img src={logoFull} alt="Lotus ConneXs" style={M.logo} />
          <div style={M.heroText}>
            <p style={M.heroLine}>{HERO_TEXT_EN[0]}</p>
            <p style={M.heroLineBold}>{HERO_TEXT_EN[1]}</p>
          </div>
          {returningUser ? (
            <div style={W.wrap}>
              {returningUser.avatar_url ? (
                <img src={returningUser.avatar_url} alt="" style={W.avatar} />
              ) : (
                <div style={W.avatarFallback}>{(returningUser.username || '?').charAt(0).toUpperCase()}</div>
              )}
              <p style={W.welcomeText}>
                {tx.welcomeBack || 'Welcome back'}{returningUser.username ? `, ${returningUser.username}` : ''}!
              </p>
              <button type="button" onClick={handleContinueSession} style={{ ...M.btnPink, width: '100%', boxSizing: 'border-box' }}>
                {tx.login || 'Log In'}
              </button>
              <button type="button" onClick={handleUseDifferentAccount} style={W.switchLink}>
                {tx.useDifferentAccount || 'Use a different account'}
              </button>
            </div>
          ) : (
            <>
              {!showEmailForm ? (
                <div style={M.form}>
                  <button type="button" disabled style={{ ...M.btnGoogle, opacity: 0.5, cursor: 'not-allowed' }}>
                    <img src="https://www.google.com/favicon.ico" width="18" alt="google" />
                    Continue with Google
                  </button>
                  <p style={{ color: '#ef4444', fontSize: 12, textAlign: 'center', margin: '-8px 0 0' }}>Google login coming soon</p>
                  <button type="button" onClick={() => setShowEmailForm(true)} style={M.btnPink}>
                    {tx.logInWithEmail || 'Log in with email'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLogin} style={M.form}>
                  <input type="email" placeholder={tx.email || 'Email'} value={email}
                    onChange={e => setEmail(e.target.value)} style={M.input} required />
                  <input type="password" placeholder={tx.password || 'Password'} value={password}
                    onChange={e => setPassword(e.target.value)} style={M.input} required />
                  <button type="submit" style={M.btnPink}>{tx.login || 'Log In'}</button>
                  <Link to="/forgot-password" style={M.forgotLink}>{tx.forgotPassword || 'Forgot password?'}</Link>
                </form>
              )}
              <div style={M.signupRow}>
                <p style={M.signupText}>{tx.noAccount || "Don't have an account?"}</p>
                <Link to="/register" style={M.joinBtn}>
                  <span style={M.joinBtnMain}>{c.cta}</span>
                </Link>
              </div>
            </>
          )}
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
              <p style={S.heroLineBold}>{HERO_TEXT_EN[1]}</p>
            </div>
            {returningUser ? (
              <div style={W.wrap}>
                {returningUser.avatar_url ? (
                  <img src={returningUser.avatar_url} alt="" style={W.avatar} />
                ) : (
                  <div style={W.avatarFallback}>{(returningUser.username || '?').charAt(0).toUpperCase()}</div>
                )}
                <p style={W.welcomeText}>
                  {tx.welcomeBack || 'Welcome back'}{returningUser.username ? `, ${returningUser.username}` : ''}!
                </p>
                <button type="button" onClick={handleContinueSession} style={{ ...S.btnPink, width: '100%', boxSizing: 'border-box' }}>
                  {tx.login || 'Log In'}
                </button>
                <button type="button" onClick={handleUseDifferentAccount} style={W.switchLink}>
                  {tx.useDifferentAccount || 'Use a different account'}
                </button>
              </div>
            ) : (
              <>
                {!showEmailForm ? (
                  <div style={S.form}>
                    <button type="button" disabled style={{ ...S.btnGoogle, opacity: 0.5, cursor: 'not-allowed' }}>
                      <img src="https://www.google.com/favicon.ico" width="20" alt="google" />
                      Continue with Google
                    </button>
                    <p style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', margin: '-10px 0 0' }}>Google login coming soon</p>
                    <button type="button" onClick={() => setShowEmailForm(true)} style={S.btnPink}>
                      {tx.logInWithEmail || 'Log in with email'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleLogin} style={S.form}>
                    <input type="email" placeholder={tx.email || 'Email'} value={email}
                      onChange={e => setEmail(e.target.value)} style={S.input} required />
                    <input type="password" placeholder={tx.password || 'Password'} value={password}
                      onChange={e => setPassword(e.target.value)} style={S.input} required />
                    <button type="submit" style={S.btnPink}>{tx.login || 'Log In'}</button>
                    <Link to="/forgot-password" style={S.forgotLink}>{tx.forgotPassword || 'Forgot password?'}</Link>
                  </form>
                )}
                <div style={S.signupRow}>
                  <p style={S.signupText}>{tx.noAccount || "Don't have an account?"}</p>
                  <Link to="/register" style={S.joinBtn}>
                    <span style={S.joinBtnMain}>{c.cta}</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Photo grid side */}
        <div style={S.cardsWrap}>
          <UserPhotoGrid isMobile={isMobile} />
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
  heroText: { textAlign: 'center', marginBottom: 28, width: '100%' },
  heroLine: { color: '#cbd5e1', fontSize: 14, lineHeight: 1.6, margin: '0 0 10px' },
  heroLineBold: { color: '#e91e63', fontWeight: 700, fontSize: 15, margin: 0 },
  section: {
    padding: '48px 24px 40px',
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
  form: { display: 'flex', flexDirection: 'column', gap: 18, width: '100%' },
  divider: { display: 'flex', alignItems: 'center', margin: '2px 0' },
  hr: { flex: 1, border: 'none', borderTop: '1px solid #334155' },
  orText: { padding: '0 14px', color: '#64748b', fontSize: '13px' },
  btnGoogle: { padding: '15px 16px', borderRadius: 14, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontWeight: 600, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', boxSizing: 'border-box' },
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
    borderRadius: 14,
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
    marginTop: 28,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  signupText: { margin: 0, color: '#94a3b8', fontSize: 14 },
  signupBtn: {
    display: 'block',
    width: '100%',
    padding: '15px',
    borderRadius: 14,
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
    borderRadius: 14,
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
const W = {
  wrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: '460px', padding: '12px 0' },
  avatar: { width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid #e91e63', boxShadow: '0 6px 20px rgba(233,30,99,0.4)' },
  avatarFallback: { width: 96, height: 96, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800, color: '#f1f5f9', border: '3px solid #e91e63' },
  welcomeText: { color: '#f1f5f9', fontSize: 18, fontWeight: 700, margin: 0, textAlign: 'center' },
  switchLink: { background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', marginTop: 4 },
};

const S = {
  heroText: { textAlign: 'center', marginBottom: 24, width: '100%', maxWidth: 520 },
  heroLine: { color: '#cbd5e1', fontSize: 16, lineHeight: 1.7, margin: '0 0 12px' },
  heroLineBold: { color: '#e91e63', fontWeight: 700, fontSize: 18, margin: 0 },
  page: { display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', background: '#0f172a' },
  formWrap: { width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 48px 40px', background: '#0f172a', boxSizing: 'border-box' },
  formInner: { width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#1e293b', borderRadius: '24px', padding: '48px 48px', boxShadow: '0 12px 40px rgba(0,0,0,0.35)', boxSizing: 'border-box' },
  logoBig: {
    display: 'block',
    width: '100%',
    maxWidth: '460px',
    height: 'auto',
    objectFit: 'contain',
    margin: '0 auto 20px',
    borderRadius: '14px',
    boxShadow: '0 6px 24px rgba(233,30,99,0.3)',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '460px' },
  input: { padding: '16px 18px', borderRadius: '14px', border: '1px solid #334155', fontSize: '17px', background: '#1e293b', color: '#f1f5f9', outline: 'none' },
  btnPink: { padding: '17px', borderRadius: '14px', border: 'none', background: '#e91e63', color: '#fff', fontWeight: 700, fontSize: '17px', cursor: 'pointer', marginTop: '4px' },
  divider: { display: 'flex', alignItems: 'center', margin: '6px 0' },
  hr: { flex: 1, border: 'none', borderTop: '1px solid #334155' },
  orText: { padding: '0 14px', color: '#64748b', fontSize: '14px' },
  btnGoogle: { padding: '16px', borderRadius: '14px', border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontWeight: 600, fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  signupRow: { marginTop: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '460px' },
  signupText: { margin: 0, textAlign: 'center', color: '#94a3b8', fontSize: '15px' },
  signupBtn: {
    display: 'block',
    width: '100%',
    padding: '15px',
    borderRadius: '14px',
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
    borderRadius: '14px',
    textDecoration: 'none',
    boxShadow: '0 10px 32px rgba(233,30,99,0.5), 0 0 0 1px rgba(233,30,99,0.3)',
    textAlign: 'center',
  },
  joinBtnMain: { color: '#fff', fontWeight: 800, fontSize: '20px', letterSpacing: '0.5px' },
  joinBtnPrize: { color: '#fde68a', fontWeight: 700, fontSize: '13px', letterSpacing: '0.3px' },
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