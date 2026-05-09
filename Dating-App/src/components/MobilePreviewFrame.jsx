// src/components/MobilePreviewFrame.jsx
import { useLocation } from 'react-router-dom';
import { useMobilePreview } from '../hooks/useMobilePreview';

const inIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

export default function MobilePreviewFrame({ children }) {
  const [enabled, setEnabled] = useMobilePreview();
  const location = useLocation();

  if (inIframe || !enabled) return children;

  const url = `${location.pathname}${location.search}`;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 14, padding: 24, zIndex: 99999,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, color:'#f1f5f9', fontSize:13, fontWeight:700 }}>
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

      <div style={{
        width: 430, height: 'min(90vh, 932px)',
        borderRadius: 44, background: '#0a0a0a', padding: 14,
        boxShadow: '0 30px 90px rgba(0,0,0,0.7), 0 0 0 2px #2a2a2a, inset 0 0 0 1px #3a3a3a',
        position: 'relative',
      }}>
        <div style={{
          position:'absolute', top:18, left:'50%', transform:'translateX(-50%)',
          width:110, height:28, borderRadius:16, background:'#000',
          zIndex:5, pointerEvents:'none',
        }} />
        <iframe
          key={url}
          src={url}
          title="Mobile Preview"
          style={{
            width:'100%', height:'100%', border:'none',
            borderRadius:32, background:'#fff', display:'block',
          }}
        />
      </div>

      <div style={{ color:'#64748b', fontSize:11 }}>
        Navigate inside the frame - Same session as desktop
      </div>
    </div>
  );
}
