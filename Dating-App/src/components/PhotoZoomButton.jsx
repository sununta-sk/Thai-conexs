// src/components/PhotoZoomButton.jsx
// Small "enlarge" button pinned to a photo's bottom-right corner, for touch
// screens (no hover, so the magnifier cursor from lib/zoomCursor.js never
// shows there). The parent must be position: relative.
import { MagnifyingGlassPlusIcon } from './Icons';

export default function PhotoZoomButton({ onClick, size = 32, inset = 8, style }) {
  return (
    <button
      type="button"
      aria-label="Enlarge photo"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      style={{
        position: 'absolute', right: inset, bottom: inset, zIndex: 3,
        width: size, height: size, padding: 0, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.72)', border: '1px solid rgba(255,255,255,0.25)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)', color: '#fff', cursor: 'pointer',
        ...style,
      }}
    >
      <MagnifyingGlassPlusIcon size={Math.round(size * 0.56)} />
    </button>
  );
}
