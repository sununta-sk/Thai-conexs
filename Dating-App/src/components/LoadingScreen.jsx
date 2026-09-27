// Transparent Lotus ConneXs logo (black outline removed) inside a soft oval
// of pink glitter, 480x240 = 2x for the 240x120 display size below. This is
// on the app's guaranteed-first-paint path (rendered before the auth session
// check resolves, on every visit), so it's kept small: 38KB WebP. The old
// 110px round tile (LotusConnexs-loading.jpeg, 26.6KB) is no longer used.
import logoImg from '../lib/LotusConnexs-loading-sparkle.webp';

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div style={S.wrap}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.85; }
        }
      `}</style>
      <div style={S.logoWrap}>
        <img src={logoImg} alt="Lotus ConneXs" style={S.logo} />
      </div>
      <div style={S.text}>{message}</div>
    </div>
  );
}

const S = {
  wrap: {
    background: '#0f172a',
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    position: 'relative',
  },
  logoWrap: {
    position: 'relative',
    width: 240,
    height: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'pulse 1.8s ease-in-out infinite',
  },
  logo: {
    width: 240,
    height: 120,
    objectFit: 'contain',
    filter: 'drop-shadow(0 0 18px rgba(233, 30, 99, 0.45))',
    opacity: 0.95,
  },
  text: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.5,
    marginTop: 24,
  },
};
