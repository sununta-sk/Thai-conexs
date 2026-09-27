// src/components/InvisibleModeToggle.jsx
// VIP-only slide toggle — hides the VIP badge/shimmer frame across Discover
// cards, navbar avatar rings, chat header/sidebar, and the public profile
// page (all wired in a separate pass — see the 6 render-condition sites,
// each already checking `!profile.is_invisible`). This component only
// flips the flag; it never touches ranking, messaging, or profile
// visibility, which is why a plain update() is enough here — unlike the
// lotus RPCs, this isn't payment/balance data, just a personal display
// preference on the user's own row.
//
// Shared between Navbar.jsx (desktop) and MobileNavbar.jsx (mobile) rather
// than duplicated, matching how this codebase already shares small UI
// components with real behavior (NotificationBell, BoostButton) rather
// than copy-pasting them per navbar.
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from '../hooks/useTranslation';
import { XIcon } from './Icons';

const HINT_SEEN_KEY = 'invisibleModeHintSeen';

// Pill switch in the style SK picked (2026-09-27): a white pill knob with a
// small inset dot slides left (Off, teal track, "Off" on the right) or right
// (On, coral track, "On" on the left). md for the desktop navbar, sm for the
// mobile top bar - the same two sizes as LanguageSwitch beside it.
const SIZES = {
  md: { w: 76, h: 32, knob: 34, dot: 10, font: 12.5 },
  sm: { w: 64, h: 28, knob: 26, dot: 8, font: 11 },
};
const BORDER = 1;
const PAD = 3;

export default function InvisibleModeToggle({ userId, isInvisible, onChange, size = 'md' }) {
  const d = SIZES[size] || SIZES.md;
  const knobH = d.h - BORDER * 2 - PAD * 2;
  const travel = d.w - BORDER * 2 - PAD * 2 - d.knob;
  const { tx } = useTranslation(['invisibleMode']);
  const [saving, setSaving] = useState(false);
  const [showHint, setShowHint] = useState(() => {
    try { return !localStorage.getItem(HINT_SEEN_KEY); } catch { return false; }
  });

  const dismissHint = () => {
    setShowHint(false);
    try { localStorage.setItem(HINT_SEEN_KEY, '1'); } catch {
      // localStorage might fail in private mode - just don't persist the dismissal
    }
    // LanguageSwitch holds its own first-time hint back until this one is
    // gone, so the two popovers never overlap.
    window.dispatchEvent(new Event('tcn-invisible-hint-dismissed'));
  };

  const handleToggle = async () => {
    if (saving || !userId) return;
    const next = !isInvisible;
    setSaving(true);
    onChange(next); // optimistic - avatar ring etc. flip immediately
    const { error } = await supabase.from('profiles').update({ is_invisible: next }).eq('id', userId);
    if (error) {
      console.error('[InvisibleModeToggle] update failed:', error.message);
      onChange(!next); // revert on failure
    }
    setSaving(false);
    if (showHint) dismissHint();
  };

  return (
    <div style={S.wrap}>
      <style>{`
        .tcn-vip-switch:focus { outline: none; }
        .tcn-vip-switch:focus-visible { outline: 2px solid #f472b6; outline-offset: 2px; }
      `}</style>
      <button
        type="button"
        role="switch"
        aria-checked={isInvisible}
        className="tcn-vip-switch"
        onClick={handleToggle}
        disabled={saving}
        title={tx.tooltip || 'Hide your VIP badge from other users'}
        aria-label={tx.toggleLabel || 'Hide VIP badge'}
        style={{ ...S.track, ...(isInvisible ? S.trackOn : S.trackOff), width: d.w, height: d.h, opacity: saving ? 0.6 : 1 }}
      >
        <span style={{ ...S.label, ...S.labelOn, fontSize: d.font, left: PAD + 8, opacity: isInvisible ? 1 : 0 }}>{tx.onLabel || 'On'}</span>
        <span style={{ ...S.label, ...S.labelOff, fontSize: d.font, right: PAD + 7, opacity: isInvisible ? 0 : 1 }}>{tx.offLabel || 'Off'}</span>
        <span style={{ ...S.knob, width: d.knob, height: knobH, top: PAD, left: PAD, transform: `translateX(${isInvisible ? travel : 0}px)` }}>
          <span style={{ ...S.knobDot, width: d.dot, height: d.dot }} />
        </span>
      </button>

      {showHint && (
        <div style={S.hint} onClick={(e) => e.stopPropagation()}>
          <div style={{ ...S.hintArrow, right: d.w / 2 - 6 }} />
          <button style={S.hintClose} onClick={dismissHint} aria-label="Close"><XIcon size={13} /></button>
          <div style={S.hintTitle}>{tx.hintTitle || 'Hide your VIP badge'}</div>
          <div style={S.hintBody}>
            {tx.hintBody || 'Turn this on to hide the VIP badge and shimmer frame on your profile, Discover card, and chat — your profile stays fully visible to everyone, only the badge is hidden.'}
          </div>
          <button style={S.hintCta} onClick={dismissHint}>{tx.gotIt || 'Got it'}</button>
        </div>
      )}
    </div>
  );
}

const S = {
  wrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  track: {
    position: 'relative', flexShrink: 0, padding: 0, cursor: 'pointer', borderRadius: 999,
    boxSizing: 'border-box', border: `${BORDER}px solid rgba(0,0,0,0.35)`,
    transition: 'background 0.25s, box-shadow 0.25s',
  },
  trackOff: {
    background: 'linear-gradient(180deg, #3ccfc0 0%, #25a99b 100%)',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), inset 0 -1px 0 rgba(255,255,255,0.25)',
  },
  trackOn: {
    background: 'linear-gradient(180deg, #f2677a 0%, #d63650 100%)',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), inset 0 -1px 0 rgba(255,255,255,0.2)',
  },
  label: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', lineHeight: 1,
    fontWeight: 800, letterSpacing: 0.3, transition: 'opacity 0.2s',
    pointerEvents: 'none', userSelect: 'none',
  },
  labelOff: { color: '#0b4f48', textShadow: '0 1px 0 rgba(255,255,255,0.3)' },
  labelOn: { color: '#6b1020', textShadow: '0 1px 0 rgba(255,255,255,0.25)' },
  knob: {
    position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 999, background: 'linear-gradient(180deg, #ffffff 0%, #e5e9f0 100%)',
    boxShadow: '0 2px 5px rgba(0,0,0,0.4), inset 0 -2px 0 rgba(0,0,0,0.08), inset 0 1px 0 #fff',
    transition: 'transform 0.25s cubic-bezier(.4,.1,.2,1)',
  },
  knobDot: {
    display: 'block', borderRadius: '50%', background: '#a9dcd5',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.35), 0 1px 0 #fff',
  },
  hint: {
    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
    width: 240, background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
    padding: '14px 16px', boxShadow: '0 8px 28px rgba(0,0,0,0.5)', zIndex: 200,
  },
  hintArrow: {
    position: 'absolute', top: -6, right: 12, transform: 'rotate(45deg)',
    width: 12, height: 12, background: '#1e293b', borderLeft: '1px solid #334155', borderTop: '1px solid #334155',
  },
  hintClose: {
    position: 'absolute', top: 8, right: 8, background: 'none', border: 'none',
    color: '#64748b', cursor: 'pointer', fontSize: 12, padding: 4, display: 'flex',
  },
  hintTitle: { fontSize: 13, fontWeight: 800, color: '#f1f5f9', marginBottom: 4, paddingRight: 16 },
  hintBody: { fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginBottom: 10 },
  hintCta: {
    background: '#e91e63', color: '#fff', border: 'none', borderRadius: 8,
    padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
  },
};
