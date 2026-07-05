import logoImg from '../lib/LotusConnexs-full.jpeg';

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
        <img src={logoImg} alt="Lotus ConeXs" style={S.logo} />
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
    width: 120,
    height: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'pulse 1.8s ease-in-out infinite',
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: '50%',
    objectFit: 'cover',
    filter: 'drop-shadow(0 0 24px rgba(233, 30, 99, 0.6))',
    mixBlendMode: 'screen',
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
