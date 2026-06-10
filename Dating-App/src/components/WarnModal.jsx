import { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';

const COPY = {
  en: {
    title: 'Warning',
    subtitle: 'You have received a moderation warning.',
    reasonLabel: 'Reason',
    timeLabel: 'Time remaining',
    defaultReason: 'Violation of community rules',
    readRules: 'Read Community Rules',
    expired: 'Warning period ended.\nReloading...',
    footnote: 'You will regain access automatically when the time expires.',
  },
  th: {
    title: 'คำเตือน',
    subtitle: 'บัญชีของคุณได้รับคำเตือนจากทีม moderation',
    reasonLabel: 'เหตุผล',
    timeLabel: 'เวลาที่เหลือ',
    defaultReason: 'ละเมิดกฎของชุมชน',
    readRules: 'อ่านกฎของชุมชน',
    expired: 'หมดเวลาเตือนแล้ว\nกำลังโหลดใหม่...',
    footnote: 'คุณจะกลับมาใช้งานได้อัตโนมัติเมื่อเวลาหมด',
  },
};

export default function WarnModal({ expiresAt, reason, message }) {
  const { lang } = useTranslation(['common']);
  const t = COPY[lang === 'th' ? 'th' : 'en'];
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const end = new Date(expiresAt).getTime();
      const ms = end - now;

      if (ms <= 0) {
        setIsExpired(true);
        setTimeLeft({ h: 0, m: 0, s: 0 });
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setTimeLeft({ h, m, s });
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const handleReadRules = () => {
    window.open('/rules', '_blank');
  };

  const formatTime = () => {
    if (!timeLeft) return '...';
    const { h, m, s } = timeLeft;
    const pad = (n) => String(n).padStart(2, '0');
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  };

  return (
    <div style={S.backdrop}>
      <div style={S.modal}>
        <div style={S.iconWrap}>
          <div style={S.icon}>{'\u26A0'}</div>
        </div>

        <h2 style={S.title}>{t.title}</h2>
        <p style={S.subtitle}>
          {isExpired ? t.expired : t.subtitle}
        </p>

        {!isExpired && (
          <>
            <div style={S.box}>
              <div style={S.boxLabel}>{t.reasonLabel}</div>
              <div style={S.boxText}>
                {message || reason || t.defaultReason}
              </div>
            </div>

            <div style={{ ...S.box, marginBottom: 22 }}>
              <div style={S.boxLabel}>{t.timeLabel}</div>
              <div style={S.timerText}>{formatTime()}</div>
            </div>

            <button style={S.primaryBtn} onClick={handleReadRules}>
              {t.readRules}
            </button>

            <p style={S.footnote}>{t.footnote}</p>
          </>
        )}
      </div>
    </div>
  );
}

const AMBER = '#f59e0b';
const AMBER_DARK = '#d97706';

const S = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    zIndex: 99998,
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
  },
  iconWrap: {
    width: 72,
    height: 72,
    background: '#fef3c7',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    border: `3px solid #fde68a`,
  },
  icon: {
    fontSize: 36,
    color: AMBER,
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
    background: '#fffbeb',
    border: '1px solid #fde68a',
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
    color: AMBER_DARK,
    letterSpacing: '0.5px',
  },
  primaryBtn: {
    width: '100%',
    background: AMBER,
    color: '#fff',
    border: 'none',
    padding: '13px',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)',
  },
  footnote: {
    fontSize: 12,
    color: '#999',
    margin: '14px 0 0',
    fontStyle: 'italic',
  },
};
