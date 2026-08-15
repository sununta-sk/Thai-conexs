// src/components/PhotoEnlargeModal.jsx
// Shared click-to-enlarge photo popup, used by RoomChat.jsx's desktop
// sidebar carousel and UserProfilePage.jsx's mobile Bio-page carousel.
//
// Now also handles in-modal prev/next navigation across a profile's whole
// photo set (arrows, swipe, and left/right arrow keys), so a user can
// browse every photo without closing and reopening the modal per photo.
// The paywall stays a single check inside this component - callers hand it
// their existing (isSubscriber, freeLimit) pair instead of pre-computing
// isLocked themselves, so navigating past the free limit *inside* the
// modal hits the exact same gate the outer carousel already enforces, not
// a second copy of the rule that could drift from it.

import { useEffect, useRef, useState } from 'react';

export default function PhotoEnlargeModal({
  photos,
  startIndex = 0,
  altPrefix = '',
  isSubscriber = false,
  freeLimit = 3,
  onUpgrade,
  onClose,
  onIndexChange,
  lockLabels,
}) {
  const list = Array.isArray(photos) && photos.length > 0 ? photos : null;
  const [current, setCurrent] = useState(startIndex);
  // Tracks whether the CURRENT photo has finished loading, so a slow
  // in-modal prev/next (e.g. a photo that wasn't preloaded yet) shows the
  // app's existing spinner instead of a blank/dark frame. Reset on every
  // index change since the <img> below is remounted (key={current}) and
  // starts a fresh load each time.
  const [loaded, setLoaded] = useState(false);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  useEffect(() => { setLoaded(false); }, [current]);

  if (!list) return null;
  const src = list[current];
  if (!src) return null;

  const labels = {
    title: 'Priority Members Only',
    sub: 'Available to Priority Members',
    btn: '🚀 Upgrade for full access',
    ...lockLabels,
  };

  const goTo = (i) => {
    const next = (i + list.length) % list.length;
    setCurrent(next);
    onIndexChange?.(next);
  };
  const prev = () => goTo(current - 1);
  const next = () => goTo(current + 1);
  const isLocked = !isSubscriber && current >= freeLimit;

  useEffect(() => {
    if (list.length <= 1) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, list.length]);

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchMove = (e) => { touchEndX.current = e.touches[0].clientX; };
  const onTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) (diff > 0 ? next() : prev());
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      {/* Reuses the app's existing spinner (same border/borderTopColor/spin
          pattern as ProfilePage.jsx, UserProfilePage.jsx, AccountSettings.jsx,
          BoostModal.jsx) rather than inventing a new loading indicator.
          Positioned on the overlay itself, not inside .frame - .frame's size
          comes entirely from the <img>'s own natural dimensions, so while
          unloaded it has no stable size to center a spinner within. */}
      {!loaded && !isLocked && (
        <>
          <div style={S.spinner} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
      <div style={S.frame} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <img
          key={current}
          src={src}
          alt={altPrefix ? `${altPrefix}-${current}` : ''}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          style={{ ...S.img, opacity: (loaded || isLocked) ? 1 : 0, filter: isLocked ? 'blur(18px)' : 'none', transform: isLocked ? 'scale(1.1)' : 'scale(1)' }}
        />

        {isLocked && (
          <div style={S.lockOverlay}>
            <div style={S.lockBox}>
              <div style={S.lockIcon}>🔒</div>
              <div style={S.lockTitle}>{labels.title}</div>
              <div style={S.lockSub}>{labels.sub}</div>
              <button type="button" style={S.lockBtn} onClick={onUpgrade}>{labels.btn}</button>
            </div>
          </div>
        )}

        {list.length > 1 && (
          <>
            <button type="button" style={{ ...S.arrow, left: -16 }} onClick={prev} aria-label="Previous photo">‹</button>
            <button type="button" style={{ ...S.arrow, right: -16 }} onClick={next} aria-label="Next photo">›</button>
            <div style={S.counter}>{current + 1} / {list.length}</div>
          </>
        )}

        <button type="button" style={S.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      </div>
    </div>
  );
}

const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10000,
    padding: '24px',
  },
  frame: { position: 'relative', maxWidth: '92vw', maxHeight: '92vh', touchAction: 'pan-y' },
  // Same values as the app's existing small spinner (ProfilePage.jsx /
  // UserProfilePage.jsx's S.spinner) - centered on the viewport via the
  // overlay rather than the frame, since the frame has no stable size to
  // center within before the image has loaded.
  spinner: {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: 36, height: 36,
    border: '3px solid rgba(233,30,99,0.2)',
    borderTopColor: '#e91e63',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    zIndex: 1,
  },
  img: {
    display: 'block',
    maxWidth: '92vw',
    maxHeight: '92vh',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    borderRadius: 16,
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
    transition: 'filter 0.3s, transform 0.3s',
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14,
    width: 36, height: 36,
    borderRadius: '50%',
    background: 'rgba(15,23,42,0.75)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#f1f5f9',
    fontSize: 16, fontWeight: 700,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
  },
  // Arrows sit just outside the frame's edges (negative left/right) so they
  // never cover the photo itself - the frame is only as wide as the image,
  // so this stays clear of the close button regardless of image aspect ratio.
  arrow: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    width: 44, height: 44, borderRadius: '50%',
    background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,255,255,0.15)', color: '#f1f5f9',
    fontSize: 26, fontWeight: 700, lineHeight: 1, paddingBottom: 3,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)', zIndex: 2,
  },
  counter: {
    position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)',
    color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px',
    borderRadius: 999, border: '1px solid rgba(255,255,255,0.15)',
  },
  lockOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  lockBox: { textAlign: 'center', padding: '24px 20px', background: 'rgba(30, 41, 59, 0.95)', border: '1px solid #334155', borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxWidth: 280 },
  lockIcon: { fontSize: 36, marginBottom: 8 },
  lockTitle: { fontSize: 16, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 },
  lockSub: { fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.5 },
  lockBtn: { width: '100%', padding: '12px 16px', background: 'linear-gradient(135deg, #e91e63, #c2185b)', border: 'none', borderRadius: 30, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', lineHeight: 1.4 },
};
