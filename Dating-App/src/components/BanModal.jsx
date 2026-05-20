import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from '../hooks/useTranslation';

const COPY = {
  en: {
    greeting: 'Hello',
    apologyTemp: 'We are sorry — your account has been temporarily suspended.',
    apologyPerm: 'We are sorry — your account has been permanently banned.',
    expired: 'Your suspension has ended.\nReloading...',
    reasonLabel: 'Reason',
    timeLabel: 'Time remaining',
    permanent: 'Permanent',
    defaultReason: 'Terms of service violation',
    readRules: 'Read Rules',
    signOut: 'Sign out',
    footnote: 'You will regain access automatically when the time expires.',
    days: 'd',
    hours: 'h',
    minutes: 'm',
  },
  th: {
    greeting: 'สวัสดีค่ะ',
    apologyTemp: 'ขอแสดงความเสียใจด้วย\nบัญชีของคุณถูกระงับชั่วคราว',
    apologyPerm: 'ขอแสดงความเสียใจด้วย\nบัญชีของคุณถูกแบนถาวร',
    expired: 'การระงับสิ้นสุดแล้ว\nกำลังโหลดใหม่...',
    reasonLabel: 'เหตุผล',
    timeLabel: 'เวลาที่เหลือ',
    permanent: 'ถาวร',
    defaultReason: 'ละเมิดข้อกำหนดการใช้งาน',
    readRules: 'อ่านกฎเพิ่มเติม',
    signOut: 'ออกจากระบบ',
    footnote: 'คุณจะกลับมาใช้งานได้อัตโนมัติเมื่อเวลาหมด',
    days: 'วัน',
    hours: 'ชม.',
    minutes: 'นาที',
  },
};

export default function BanModal({ bannedUntil, banReason }) {
  const { lang } = useTranslation(['common']);
  const t = COPY[lang === 'th' ? 'th' : 'en'];
  const isPermanent = !bannedUntil;
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (isPermanent) return;

    const update = () => {
      const now = Date.now();
      const end = new Date(bannedUntil).getTime();
      const ms = end - now;

      if (ms <= 0) {
        setIsExpired(true);
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setTimeLeft({ d, h, m, s });
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [bannedUntil, isPermanent]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleReadRules = () => {
    window.open('/rules', '_blank');
  };

  const formatTime = () => {
    if (isPermanent) return t.permanent;
    if (!timeLeft) return '...';
    const { d, h, m, s } = timeLeft;
    const pad = (n) => String(n).padStart(2, '0');
    if (d > 0) return `${d} ${t.days} ${h} ${t.hours} ${pad(m)} ${t.minutes}`;
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  };

  const apology = isPermanent ? t.apologyPerm : t.apologyTemp;

  return (
    <div style={S.backdrop}>
      <div style={S.modal}>
        <div style={S.iconWrap}>
          <div style={S.icon}>{isPermanent ? '\u26D4' : '\u23F1'}</div>
        </div>

        <h2 style={S.title}>{t.greeting}</h2>
        <p style={S.subtitle}>{isExpired ? t.expired : apology}</p>

        {!isExpired && (
          <>
            <div style={S.box}>
              <div style={S.boxLabel}>{t.reasonLabel}</div>
              <div style={S.boxText}>{banReason || t.defaultReason}</div>
            </div>

            <div style={{ ...S.box, marginBottom: 24 }}>
              <div style={S.boxLabel}>{t.timeLabel}</div>
              <div style={{
                ...S.timerText,
                color: isPermanent ? '#dc2626' : '#e91e63',
              }}>
                {formatTime()}
              </div>
            </div>

            <button style={S.primaryBtn} onClick={handleReadRules}>
              {t.readRules}
            </button>

            <button style={S.secondaryBtn} onClick={handleSignOut}>
              {t.signOut}
            </button>

            <p style={S.footnote}>{t.footnote}</p>
          </>
        )}
      </div>
    </div>
  );
}

const S = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    overflowY: 'auto',
  },
  modal: {
    background: '#fff',
    borderRadius: 20,
    maxWidth: 420,
    width: '100%',
    padding: '32px 26px 24px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    animation: 'none',
  },
  iconWrap: {
    width: 72,
    height: 72,
    background: '#fff5f7',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    border: '3px solid #fce4ec',
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: '#1a1a1a',
    margin: '0 0 6px',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: 14.5,
    color: '#666',
    margin: '0 0 22px',
    lineHeight: 1.6,
    whiteSpace: 'pre-line',
  },
  box: {
    background: '#fff5f7',
    border: '1px solid #fce4ec',
    borderRadius: 12,
    padding: '12px 14px',
    marginBottom: 10,
    textAlign: 'left',
  },
  boxLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    marginBottom: 5,
  },
  boxText: {
    fontSize: 14.5,
    color: '#333',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  timerText: {
    fontSize: 22,
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.5px',
  },
  primaryBtn: {
    width: '100%',
    background: '#e91e63',
    color: '#fff',
    border: 'none',
    padding: '13px',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    marginBottom: 8,
  },
  secondaryBtn: {
    width: '100%',
    background: 'transparent',
    color: '#666',
    border: '1px solid #ddd',
    padding: '13px',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  footnote: {
    fontSize: 12,
    color: '#999',
    margin: '14px 0 0',
    fontStyle: 'italic',
  },
};
