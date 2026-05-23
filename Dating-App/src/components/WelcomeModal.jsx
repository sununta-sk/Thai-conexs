import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from '../hooks/useTranslation';
import logoFull from '../lib/LotusConnexs-full.jpeg';

const DAY_KEY = 'welcomeModalDismissedDate';

const COPY = {
  en: {
    welcome: 'Welcome to Lotus ConneXs',
    tagline: 'Real connections with Thai singles — start chatting instantly, no matching required.',
    features: [
      { icon: '\u2713', title: 'Verified Profiles', desc: 'Face verification and photo moderation keep the community real.' },
      { icon: '\u2728', title: 'Auto-Translation', desc: 'Chat naturally in Thai or English — messages translate in real time.' },
      { icon: '\u26A1', title: 'Instant Chat', desc: 'Send messages, GIFs, and voice notes to anyone, anytime.' },
    ],
    cta: 'Start Exploring',
    dontShow: "Don't show this again today",
    close: 'Close',
  },
  th: {
    welcome: 'ยินดีต้อนรับสู่ Lotus ConneXs',
    tagline: 'พบคนไทยจริงๆ เริ่มแชทได้ทันที ไม่ต้องรอจับคู่',
    features: [
      { icon: '\u2713', title: 'โปรไฟล์ยืนยันตัวตน', desc: 'ระบบยืนยันใบหน้าและตรวจรูปภาพ ทำให้ชุมชนของเรามีแต่คนจริงๆ' },
      { icon: '\u2728', title: 'แปลภาษาอัตโนมัติ', desc: 'แชทเป็นไทยหรืออังกฤษ ระบบแปลให้แบบเรียลไทม์' },
      { icon: '\u26A1', title: 'แชทได้ทันที', desc: 'ส่งข้อความ GIF เสียง ได้ทันทีถึงทุกคน' },
    ],
    cta: 'เริ่มสำรวจ',
    dontShow: 'ไม่ต้องแสดงอีกในวันนี้',
    close: 'ปิด',
  },
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function WelcomeModal() {
  const { lang } = useTranslation(['common']);
  const t = COPY[lang === 'th' ? 'th' : 'en'];
  const [show, setShow] = useState(false);
  const [snoozeToday, setSnoozeToday] = useState(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      // Only show for authenticated users
      const { data } = await supabase.auth.getSession();
      if (!mounted || !data.session) return;

      // Snooze check — only day-level
      try {
        const dayDismissed = localStorage.getItem(DAY_KEY);
        if (dayDismissed === todayStr()) return;
      } catch {
        // localStorage might fail in private mode
        return;
      }

      setShow(true);
    };

    check();
    return () => { mounted = false; };
  }, []);

  const handleClose = () => {
    if (snoozeToday) {
      try {
        localStorage.setItem(DAY_KEY, todayStr());
      } catch {
        // ignore storage errors
      }
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={S.backdrop} onClick={handleClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <button style={S.closeBtn} onClick={handleClose} aria-label="Close">
          {'\u2715'}
        </button>

        <div style={S.scroll}>
          <div style={S.header}>
            <img src={logoFull} alt="Lotus ConneXs" style={S.logo} />
            <h2 style={S.welcome}>{t.welcome}</h2>
            <p style={S.tagline}>{t.tagline}</p>
          </div>

          <div style={S.features}>
            {t.features.map((f, i) => (
              <div key={i} style={S.feature}>
                <div style={S.featureIcon}>{f.icon}</div>
                <div style={S.featureBody}>
                  <h3 style={S.featureTitle}>{f.title}</h3>
                  <p style={S.featureDesc}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button style={S.cta} onClick={handleClose}>
            {t.cta}
          </button>
        </div>

        <div style={S.footer}>
          <label style={S.dontShowLabel}>
            <input
              type="checkbox"
              checked={snoozeToday}
              onChange={(e) => setSnoozeToday(e.target.checked)}
              style={S.checkbox}
            />
            <span>{t.dontShow}</span>
          </label>
        </div>
      </div>
    </div>
  );
}

const PINK = '#e91e63';
const PINK_GLOW = 'rgba(233, 30, 99, 0.15)';
const BG_ELEV = '#1e293b';
const BORDER = '#334155';
const TEXT = '#f1f5f9';
const TEXT_SOFT = '#cbd5e1';
const TEXT_MUTED = '#94a3b8';

const S = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 9000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    background: BG_ELEV,
    borderRadius: 20,
    maxWidth: 520,
    width: '100%',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${BORDER}`,
    boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(233, 30, 99, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    border: `1px solid ${BORDER}`,
    color: TEXT_SOFT,
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scroll: {
    overflowY: 'auto',
    padding: '28px 24px 20px',
    flex: 1,
  },
  header: {
    textAlign: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 14,
    marginBottom: 14,
    boxShadow: `0 8px 24px ${PINK_GLOW}`,
  },
  welcome: {
    fontSize: 22,
    fontWeight: 800,
    color: TEXT,
    margin: '0 0 8px',
    letterSpacing: '-0.3px',
  },
  tagline: {
    fontSize: 14.5,
    color: TEXT_SOFT,
    margin: 0,
    lineHeight: 1.5,
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    marginBottom: 24,
  },
  feature: {
    display: 'flex',
    gap: 14,
    padding: 14,
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    border: `1px solid ${BORDER}`,
  },
  featureIcon: {
    width: 36,
    height: 36,
    minWidth: 36,
    background: PINK_GLOW,
    color: PINK,
    border: `1px solid ${PINK}`,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 900,
  },
  featureBody: { flex: 1 },
  featureTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: TEXT,
    margin: '0 0 4px',
  },
  featureDesc: {
    fontSize: 13.5,
    color: TEXT_SOFT,
    margin: 0,
    lineHeight: 1.5,
  },
  cta: {
    width: '100%',
    padding: '14px',
    background: PINK,
    color: '#fff',
    fontSize: 15,
    fontWeight: 800,
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(233, 30, 99, 0.4)',
  },
  footer: {
    padding: '14px 24px',
    background: 'rgba(0,0,0,0.25)',
    borderTop: `1px solid ${BORDER}`,
  },
  dontShowLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    fontSize: 13,
    color: TEXT_MUTED,
    userSelect: 'none',
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: PINK,
    cursor: 'pointer',
  },
};
