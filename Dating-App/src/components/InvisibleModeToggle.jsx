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

const HINT_SEEN_KEY = 'invisibleModeHintSeen';

export default function InvisibleModeToggle({ userId, isInvisible, onChange }) {
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
      <button
        type="button"
        onClick={handleToggle}
        disabled={saving}
        title={tx.tooltip || 'Hide your VIP badge from other users'}
        aria-label={tx.toggleLabel || 'Hide VIP badge'}
        style={{ ...S.track, background: isInvisible ? '#e91e63' : '#0f172a', opacity: saving ? 0.6 : 1 }}
      >
        <div style={{ ...S.knob, transform: isInvisible ? 'translateX(16px)' : 'translateX(2px)' }} />
      </button>

      {showHint && (
        <div style={S.hint} onClick={(e) => e.stopPropagation()}>
          <div style={S.hintArrow} />
          <button style={S.hintClose} onClick={dismissHint} aria-label="Close">✕</button>
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
    width: 36, height: 20, borderRadius: 999, border: '1px solid #334155',
    position: 'relative', cursor: 'pointer', padding: 0, transition: 'background 0.2s',
    flexShrink: 0,
  },
  knob: {
    position: 'absolute', top: 1, width: 16, height: 16, borderRadius: '50%',
    background: '#fff', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
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
    color: '#64748b', cursor: 'pointer', fontSize: 12, padding: 4,
  },
  hintTitle: { fontSize: 13, fontWeight: 800, color: '#f1f5f9', marginBottom: 4, paddingRight: 16 },
  hintBody: { fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginBottom: 10 },
  hintCta: {
    background: '#e91e63', color: '#fff', border: 'none', borderRadius: 8,
    padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
  },
};
