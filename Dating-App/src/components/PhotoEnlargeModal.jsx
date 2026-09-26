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
import { LockIcon, DiamondIcon, XIcon, CaretLineLeftIcon, CaretLineRightIcon } from './Icons';

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
    btn: 'Upgrade for full access',
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

  const multi = list.length > 1;
  const closeOnSelf = (e) => { if (e.target === e.currentTarget) onClose(); };
  const prevBtn = (cls) => (
    <button type="button" className={cls} style={S.arrow} onClick={prev} aria-label="Previous photo"><CaretLineLeftIcon size={22} /></button>
  );
  const nextBtn = (cls) => (
    <button type="button" className={cls} style={S.arrow} onClick={next} aria-label="Next photo"><CaretLineRightIcon size={22} /></button>
  );

  return (
    <div style={S.overlay} onClick={closeOnSelf}>
      <style>{CSS}</style>
      {/* Reuses the app's existing spinner (same border/borderTopColor/spin
          pattern as ProfilePage.jsx, UserProfilePage.jsx, AccountSettings.jsx,
          BoostModal.jsx) rather than inventing a new loading indicator.
          Positioned on the overlay itself, not inside .frame - .frame's size
          comes entirely from the <img>'s own natural dimensions, so while
          unloaded it has no stable size to center a spinner within. */}
      {!loaded && !isLocked && <div style={S.spinner} />}
      <div className={multi ? 'pem-multi' : undefined} style={S.wrap} onClick={closeOnSelf}>
        <div style={S.stage} onClick={closeOnSelf}>
          {/* Prev/next sit OUTSIDE the photo: beside it on wider screens,
              in a row under it on phones (see CSS below), so they never
              cover part of the picture. */}
          {multi && prevBtn('pem-side')}
          <div style={S.frame} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
            <img
              key={current}
              className="pem-img"
              src={src}
              alt={altPrefix ? `${altPrefix}-${current}` : ''}
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
              style={{ ...S.img, opacity: (loaded || isLocked) ? 1 : 0, filter: isLocked ? 'blur(18px)' : 'none', transform: isLocked ? 'scale(1.1)' : 'scale(1)' }}
            />

            {isLocked && (
              <div style={S.lockOverlay}>
                <div style={S.lockBox}>
                  <div style={S.lockIcon}><LockIcon size={36} color="#e91e63" /></div>
                  <div style={S.lockTitle}>{labels.title}</div>
                  <div style={S.lockSub}>{labels.sub}</div>
                  <button type="button" style={S.lockBtn} onClick={onUpgrade}><DiamondIcon size={16} />{labels.btn}</button>
                </div>
              </div>
            )}

            {multi && <div className="pem-counter-in" style={S.counter}>{current + 1} / {list.length}</div>}

            <button type="button" style={S.closeBtn} onClick={onClose} aria-label="Close"><XIcon size={18} /></button>
          </div>
          {multi && nextBtn('pem-side')}
        </div>
        {multi && (
          <div className="pem-bottom" style={S.bottom}>
            {prevBtn()}
            <div style={S.counterBottom}>{current + 1} / {list.length}</div>
            {nextBtn()}
          </div>
        )}
      </div>
    </div>
  );
}

// Layout that has to change with screen width lives here rather than in the
// inline styles (inline styles can't hold media queries). 767px matches the
// app's MOBILE_BREAKPOINT; `.mobile-active` is the class useIsMobile puts on
// <html> for real phones and Mobile Preview alike.
//  - Wide: arrows beside the photo; the photo is capped 160px narrower than
//    the screen (2 x 44px arrow + 2 x 12px gap + overlay padding) so there's
//    always room for them, even for a wide landscape photo.
//  - Phone: arrows + counter in a row under the photo, which keeps the photo
//    full width instead of squeezing it between two arrows.
const CSS = `
@keyframes spin { to { transform: rotate(360deg); } }
.pem-img { max-width: 92vw; max-height: 92vh; }
.pem-multi .pem-img { max-width: calc(100vw - 160px); }
.pem-bottom { display: none; }
@media (max-width: 767px) {
  .pem-side, .pem-counter-in { display: none !important; }
  .pem-bottom { display: flex; }
  .pem-multi .pem-img { max-width: 92vw; max-height: calc(92vh - 64px); }
}
.mobile-active .pem-side, .mobile-active .pem-counter-in { display: none !important; }
.mobile-active .pem-bottom { display: flex; }
.mobile-active .pem-multi .pem-img { max-width: 92vw; max-height: calc(92vh - 64px); }
`;

const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10000,
    padding: '24px',
  },
  wrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  stage: { display: 'flex', alignItems: 'center', gap: 12 },
  frame: { position: 'relative', touchAction: 'pan-y' },
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
  // max-width / max-height come from the .pem-img CSS above.
  img: {
    display: 'block',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    borderRadius: 16,
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
    transition: 'filter 0.3s, transform 0.3s',
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14,
    width: 36, height: 36, padding: 0,
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
  // Prev/next buttons (outside the photo - see CSS above). padding 0 so the
  // global button padding doesn't squeeze the icon.
  arrow: {
    width: 44, height: 44, padding: 0, flexShrink: 0, borderRadius: '50%',
    background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,255,255,0.15)', color: '#f1f5f9',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
  },
  bottom: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  counterBottom: {
    background: 'rgba(15,23,42,0.75)', color: '#fff', fontSize: 13, fontWeight: 700,
    padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.15)',
    minWidth: 56, textAlign: 'center',
  },
  counter: {
    position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)',
    color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px',
    borderRadius: 999, border: '1px solid rgba(255,255,255,0.15)',
  },
  lockOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  lockBox: { textAlign: 'center', padding: '24px 20px', background: 'rgba(30, 41, 59, 0.95)', border: '1px solid #334155', borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxWidth: 280 },
  lockIcon: { display: 'flex', justifyContent: 'center', marginBottom: 8 },
  lockTitle: { fontSize: 16, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 },
  lockSub: { fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.5 },
  lockBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 16px', background: 'linear-gradient(135deg, #e91e63, #c2185b)', border: 'none', borderRadius: 30, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', lineHeight: 1.4 },
};
