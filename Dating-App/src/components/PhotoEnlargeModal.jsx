// src/components/PhotoEnlargeModal.jsx
// Shared click-to-enlarge photo popup, used by RoomChat.jsx's desktop
// sidebar carousel and UserProfilePage.jsx's mobile Bio-page carousel.
// Callers are responsible for their own paywall gating - this component
// only ever receives a src for a photo that's already allowed to be shown
// full-size; it has no gating logic of its own.

export default function PhotoEnlargeModal({ src, alt = '', onClose }) {
  if (!src) return null;

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.frame}>
        <img src={src} alt={alt} style={S.img} />
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
  frame: { position: 'relative', maxWidth: '92vw', maxHeight: '92vh' },
  img: {
    display: 'block',
    maxWidth: '92vw',
    maxHeight: '92vh',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    borderRadius: 16,
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
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
};
