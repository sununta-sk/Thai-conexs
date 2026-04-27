// src/components/Watermark.jsx
import logoImg from '../lib/LotusConnexs.jpeg';

export default function Watermark() {
  return (
    <div style={S.wrap} aria-hidden="true">
      <img src={logoImg} alt="" style={S.img} />
    </div>
  );
}

const S = {
  wrap: {
    position: 'fixed',
    bottom: '-40px',
    left: '-40px',
    width: '320px',
    height: '320px',
    pointerEvents: 'none',
    zIndex: 0,
    userSelect: 'none',
    opacity: 0.2,
  },
  img: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    filter: 'drop-shadow(0 0 20px rgba(233,30,99,0.3))',
    userSelect: 'none',
    pointerEvents: 'none',
  },
};
