import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import comingSoonLogo from '../lib/LotusConnexs-coming soon.jpeg';
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

// ── Main Register Component ───────────────────────────────────
export default function Register() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirm) { alert('Passwords do not match'); return; }
    if (password.length < 6) { alert('Password must be at least 6 characters'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + '/login?verified=1',
      },
    });
    setLoading(false);
    if (error) { alert(error.message); return; }
    navigate('/check-email?email=' + encodeURIComponent(email));
  };

  const c = CONTENT.en;

  return (
    <div style={{ background: '#0f172a', position: 'relative', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={S.page}>
        {/* Form side */}
        <div style={S.formWrap}>
          <div style={S.formInner}>
            <img src={comingSoonLogo} alt="Lotus ConneXs" style={S.logoBig} />
            <p style={S.subheading}>Find your spark ✨</p>
            <form onSubmit={handleRegister} style={S.form}>
              <input type="email" placeholder="Email" value={email}
                onChange={e => setEmail(e.target.value)} style={S.input} required />
              <input type="password" placeholder="Password (min 6 chars)" value={password}
                onChange={e => setPassword(e.target.value)} style={S.input} required minLength={6} />
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

        {/* Photo grid side + BIG Join button under it */}
        <div style={S.cardsWrap}>
          <UserPhotoGrid />

          {/* Big Join CTA — same as Login but redirects to top of form */}
          <div style={S.joinWrap}>
            <Link to="/register" style={S.joinBtn}>
              <span style={S.joinBtnMain}>{c.cta}</span>
              <span style={S.joinBtnPrize}>🎁 {c.ctaPrize}</span>
            </Link>
            <p style={S.joinSubtext}>
              No credit card required • Free to join
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

const S = {
  page: { display: 'flex', minHeight: '100vh', background: '#0f172a' },
  formWrap: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', background: '#0f172a' },
  formInner: { width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  logoBig: {
    width: '100%',
    maxWidth: '100%',
    height: '150px',
    objectFit: 'cover',
    objectPosition: 'center 30%',
    marginBottom: '20px',
    borderRadius: '14px',
    boxShadow: '0 6px 24px rgba(233,30,99,0.3)',
  },
  heading: { margin: '0 0 6px', fontSize: '32px', fontWeight: 800, color: '#f1f5f9', textAlign: 'center' },
  subheading: { margin: '0 0 28px', color: '#94a3b8', fontSize: '16px', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' },
  input: { padding: '16px 18px', borderRadius: '14px', border: '1px solid #334155', fontSize: '17px', background: '#1e293b', color: '#f1f5f9', outline: 'none' },
  btnPink: { padding: '17px', borderRadius: '30px', border: 'none', background: '#e91e63', color: '#fff', fontWeight: 700, fontSize: '17px', cursor: 'pointer', marginTop: '4px' },
  loginText: { marginTop: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '15px' },
  loginLink: { color: '#e91e63', fontWeight: 700, textDecoration: 'none' },

  cardsWrap: { width: '460px', flexShrink: 0, background: '#1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0' },

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
