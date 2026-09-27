// src/components/LanguageSwitch.jsx
// One sliding EN/TH switch (replaces the old two-button EN | TH control):
// the round flag knob sits LEFT for English and slides RIGHT for Thai, with
// the language code on the opposite side. Used in both navbars and on the
// Login / Register / Rules pages.
//
// First-time hint: same pattern as InvisibleModeToggle's VIP hint (small
// popover with an arrow, ✕ and "Got it", remembered in localStorage), but
// always written in BOTH languages, since the person reading it may not
// read the language the app is currently showing.
import { useEffect, useId, useState } from 'react';
import { XIcon } from './Icons';

const HINT_SEEN_KEY = 'langSwitchHintSeen';
// InvisibleModeToggle's own hint key/event — when both hints would be due
// at once (a VIP who has seen neither), this one waits for that one to be
// dismissed, so the two popovers never stack on top of each other.
const VIP_HINT_SEEN_KEY = 'invisibleModeHintSeen';
const VIP_HINT_DISMISSED_EVENT = 'tcn-invisible-hint-dismissed';

const readFlag = (key) => {
  try { return !!localStorage.getItem(key); } catch { return true; }
};

function UkFlag() {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 60 30" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <clipPath id={`${id}s`}><path d="M0,0 v30 h60 v-30 z" /></clipPath>
      <clipPath id={`${id}t`}><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
      <g clipPath={`url(#${id}s)`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}t)`} stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

function ThaiFlag() {
  return (
    <svg viewBox="0 0 9 6" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="9" height="6" fill="#A51931" />
      <rect y="1" width="9" height="4" fill="#F4F5F8" />
      <rect y="2" width="9" height="2" fill="#2D2A4A" />
    </svg>
  );
}

const SIZES = {
  md: { w: 72, h: 32, knob: 24, font: 12.5 },
  sm: { w: 60, h: 28, knob: 20, font: 11 },
};
const BORDER = 1;

/**
 * @param {'en'|'th'|string} lang  current language (anything but 'th' shows the English side)
 * @param {(lang: string) => void} onChange
 * @param {'md'|'sm'} [size]
 * @param {boolean} [hint]         show the first-time hint here (default true)
 * @param {'center'|'right'} [hintAlign]
 * @param {boolean} [deferHint]    wait until the VIP hint has been dismissed
 * @param {'dark'|'light'} [theme] light = for white pages (RulesPage)
 */
export default function LanguageSwitch({ lang, onChange, size = 'md', hint = true, hintAlign = 'center', deferHint = false, theme = 'dark' }) {
  const isThai = lang === 'th';
  const d = SIZES[size] || SIZES.md;
  // The knob is positioned inside the track's border, so measure the gap
  // from the inner box - otherwise it sits 1px low and 1px short.
  const pad = (d.h - BORDER * 2 - d.knob) / 2;
  const travel = d.w - BORDER * 2 - d.knob - pad * 2;

  const [hintSeen, setHintSeen] = useState(() => readFlag(HINT_SEEN_KEY));
  const [vipHintSeen, setVipHintSeen] = useState(() => readFlag(VIP_HINT_SEEN_KEY));
  // Short delay before the hint appears, so the navbar's own data (VIP
  // status) has loaded and the hint doesn't flash in and out.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 1200);
    const onVipDismissed = () => setVipHintSeen(true);
    window.addEventListener(VIP_HINT_DISMISSED_EVENT, onVipDismissed);
    return () => { clearTimeout(t); window.removeEventListener(VIP_HINT_DISMISSED_EVENT, onVipDismissed); };
  }, []);
  const showHint = hint && settled && !hintSeen && !(deferHint && !vipHintSeen);

  const dismissHint = () => {
    setHintSeen(true);
    try { localStorage.setItem(HINT_SEEN_KEY, '1'); } catch {
      // localStorage might fail in private mode - just don't persist the dismissal
    }
  };

  const toggle = () => {
    onChange(isThai ? 'en' : 'th');
    if (!hintSeen) dismissHint();
  };

  return (
    <div style={S.wrap}>
      <style>{`
        .tcn-lang-switch:hover { border-color: #e91e6399 !important; }
        /* index.css rings every focused button (button:focus); keep the
           ring for keyboard focus only, not after a tap/click. */
        .tcn-lang-switch:focus { outline: none; }
        .tcn-lang-switch:focus-visible { outline: 2px solid #e91e63; outline-offset: 2px; }
      `}</style>
      <button
        type="button"
        role="switch"
        aria-checked={isThai}
        aria-label={isThai ? 'ภาษาไทย — switch to English' : 'English — เปลี่ยนเป็นภาษาไทย'}
        title={isThai ? 'ภาษาไทย · Thai' : 'English · อังกฤษ'}
        className="tcn-lang-switch"
        onClick={toggle}
        style={{ ...S.track, ...(theme === 'light' ? S.trackLight : null), width: d.w, height: d.h }}
      >
        <span style={{ ...S.label, ...(theme === 'light' ? S.labelLight : null), fontSize: d.font, left: pad + 7, opacity: isThai ? 1 : 0 }}>TH</span>
        <span style={{ ...S.label, ...(theme === 'light' ? S.labelLight : null), fontSize: d.font, right: pad + 7, opacity: isThai ? 0 : 1 }}>EN</span>
        <span
          style={{
            ...S.knob,
            width: d.knob, height: d.knob, top: pad, left: pad,
            transform: `translateX(${isThai ? travel : 0}px)`,
          }}
        >
          {isThai ? <ThaiFlag /> : <UkFlag />}
        </span>
      </button>

      {showHint && (
        <div style={{ ...S.hint, ...(hintAlign === 'right' ? S.hintRight : S.hintCenter) }} onClick={(e) => e.stopPropagation()}>
          <div style={{ ...S.hintArrow, ...(hintAlign === 'right' ? { right: Math.max(8, d.w / 2 - 6) } : S.hintArrowCenter) }} />
          <button style={S.hintClose} onClick={dismissHint} aria-label="Close"><XIcon size={13} /></button>
          <div style={S.hintTitle}>Language · ภาษา</div>
          <div style={S.hintRow}>
            <span style={S.hintFlag}><UkFlag /></span>
            <span>
              <span style={S.hintLine}>Slide <b style={S.hintKey}>left</b> for English</span>
              <span style={S.hintLineTh}>เลื่อนไป<b style={S.hintKey}>ซ้าย</b> = ภาษาอังกฤษ</span>
            </span>
          </div>
          <div style={S.hintRow}>
            <span style={S.hintFlag}><ThaiFlag /></span>
            <span>
              <span style={S.hintLine}>Slide <b style={S.hintKey}>right</b> for Thai</span>
              <span style={S.hintLineTh}>เลื่อนไป<b style={S.hintKey}>ขวา</b> = ภาษาไทย</span>
            </span>
          </div>
          <button style={S.hintCta} onClick={dismissHint}>Got it · เข้าใจแล้ว</button>
        </div>
      )}
    </div>
  );
}

const S = {
  wrap: { position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 },
  track: {
    position: 'relative', flexShrink: 0, padding: 0, cursor: 'pointer', borderRadius: 999, boxSizing: 'border-box',
    background: 'linear-gradient(180deg, #0b1222 0%, #131d33 100%)',
    border: `${BORDER}px solid #334155`,
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.55), inset 0 -1px 0 rgba(255,255,255,0.05)',
    transition: 'border-color 0.2s',
  },
  // Light variant: the soft pressed-in look of the reference design.
  trackLight: {
    background: 'linear-gradient(180deg, #e2e8f0 0%, #f8fafc 100%)',
    border: '1px solid #e2e8f0',
    boxShadow: 'inset 0 2px 5px rgba(15,23,42,0.18), inset 0 -1px 0 rgba(255,255,255,0.9)',
  },
  labelLight: { color: '#64748b' },
  label: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    fontWeight: 800, letterSpacing: 0.6, color: '#cbd5e1', lineHeight: 1,
    transition: 'opacity 0.2s', pointerEvents: 'none', userSelect: 'none',
  },
  knob: {
    position: 'absolute', display: 'block', borderRadius: '50%', overflow: 'hidden',
    border: '2px solid #f8fafc', boxSizing: 'border-box',
    boxShadow: '0 2px 6px rgba(0,0,0,0.55)',
    transition: 'transform 0.25s cubic-bezier(.4,.1,.2,1)',
  },

  hint: {
    position: 'absolute', top: 'calc(100% + 10px)', width: 250,
    background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
    padding: '14px 16px', boxShadow: '0 8px 28px rgba(0,0,0,0.5)', zIndex: 200,
    textAlign: 'left', cursor: 'default',
  },
  hintCenter: { left: '50%', transform: 'translateX(-50%)' },
  hintRight: { right: 0 },
  hintArrow: {
    position: 'absolute', top: -7, width: 12, height: 12, background: '#1e293b',
    borderLeft: '1px solid #334155', borderTop: '1px solid #334155', transform: 'rotate(45deg)',
  },
  hintArrowCenter: { left: 'calc(50% - 6px)' },
  hintClose: {
    position: 'absolute', top: 8, right: 8, background: 'none', border: 'none',
    color: '#64748b', cursor: 'pointer', padding: 4, display: 'flex',
  },
  hintTitle: { fontSize: 13, fontWeight: 800, color: '#f1f5f9', marginBottom: 10, paddingRight: 16 },
  hintRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  hintFlag: {
    width: 22, height: 22, flexShrink: 0, borderRadius: '50%', overflow: 'hidden',
    border: '1.5px solid #f8fafc', boxSizing: 'border-box', display: 'block',
  },
  hintLine: { display: 'block', fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 },
  hintLineTh: { display: 'block', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 },
  hintKey: { color: '#f472b6', fontWeight: 800 },
  hintCta: {
    marginTop: 4, background: '#e91e63', color: '#fff', border: 'none', borderRadius: 8,
    padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
  },
};
