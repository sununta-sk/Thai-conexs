// src/components/MobilePreviewFrame.jsx
import { useEffect } from 'react';
import { useMobilePreview } from '../hooks/useMobilePreview';

const OVERRIDE_CSS = `
/* Force 3-col card grids (Discover repeat(5, 1fr)) */
.mobile-preview-active [style*="repeat(5, 1fr)"] {
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 8px !important;
}
/* Force 3-col fixed-width grids (repeat(6, 130px)) */
.mobile-preview-active [style*="repeat(6, 130px)"] {
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 8px !important;
}
/* Tighten Navbar center button gap */
.mobile-preview-active [style*="gap: 80px"] {
  gap: 12px !important;
}
/* Avatar dropdown gap reduction */
.mobile-preview-active [style*="gap: 80"] {
  gap: 12px !important;
}
`;

export default function MobilePreviewFrame({ children }) {
  const [enabled, setEnabled] = useMobilePreview();

  useEffect(() => {
    const html = document.documentElement;
    if (enabled) html.classList.add('mobile-preview-active');
    else html.classList.remove('mobile-preview-active');
    return () => html.classList.remove('mobile-preview-active');
  }, [enabled]);

  if (!enabled) return children;

  return (
    <>
      <style>{OVERRIDE_CSS}</style>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 14, padding: 24, zIndex: 99999,
        overflow: 'auto',
      }}>
        {/* Header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          color: '#f1f5f9', fontSize: 13, fontWeight: 700,
        }}>
          Mobile Preview - 430 x 932
          <button
            onClick={() => setEnabled(false)}
            style={{
              marginLeft: 8, padding: '6px 14px', borderRadius: 6,
              background: '#e91e63', color: '#fff', border: 'none',
              cursor: 'pointer', fontWeight: 700, fontSize: 12,
            }}>
            Exit
          </button>
        </div>

        {/* Phone frame */}
        <div style={{
          width: 430, height: 'min(90vh, 932px)',
          borderRadius: 44, background: '#0a0a0a', padding: 14,
          boxShadow: '0 30px 90px rgba(0,0,0,0.7), 0 0 0 2px #2a2a2a, inset 0 0 0 1px #3a3a3a',
          position: 'relative',
          flexShrink: 0,
        }}>
          {/* Notch */}
          <div style={{
            position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
            width: 110, height: 28, borderRadius: 16, background: '#000',
            zIndex: 10, pointerEvents: 'none',
          }} />

          {/* Screen - transform creates containing block for position:fixed children */}
          <div style={{
            width: '100%', height: '100%',
            borderRadius: 32, overflow: 'auto',
            background: '#f5f5f5',
            position: 'relative',
            transform: 'translateZ(0)',
          }}>
            {children}
          </div>
        </div>

        <div style={{ color: '#64748b', fontSize: 11 }}>
          Visual preview - some media queries may not trigger
        </div>
      </div>
    </>
  );
}
