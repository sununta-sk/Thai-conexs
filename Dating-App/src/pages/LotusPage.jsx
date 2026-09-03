// src/pages/LotusPage.jsx
// Placeholder for the Lotus Flower system's own page (Phase 5, not yet
// built). Linked from ProfilePage.jsx's "Get more lotus" button - without
// this route, that link would silently bounce a logged-in user to /login
// (App.jsx's catch-all NotFound does that for any unmatched path), which
// reads as a bug rather than "coming soon". This whole file gets replaced
// wholesale once the real page ships - App.jsx's route wiring won't need
// to change then.
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../hooks/useTranslation'

export default function LotusPage() {
  const navigate = useNavigate()
  const { tx } = useTranslation(['userProfile'])

  return (
    <div style={S.page}>
      <div style={S.emoji}>🪷</div>
      <h1 style={S.title}>{tx.lotusComingSoonTitle || 'เร็วๆ นี้'}</h1>
      <p style={S.body}>{tx.lotusComingSoonBody || 'ระบบดอกบัวกำลังจะมาเร็วๆ นี้'}</p>
      <button style={S.backBtn} onClick={() => navigate('/profile')}>{tx.back || '← กลับ'}</button>
    </div>
  )
}

const S = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    textAlign: 'center',
  },
  emoji: { fontSize: 56 },
  title: { fontSize: 22, fontWeight: 800, margin: 0 },
  body: { fontSize: 14, color: '#94a3b8', margin: 0, maxWidth: 320 },
  backBtn: {
    marginTop: 12,
    padding: '10px 20px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.1)',
    background: '#1e293b',
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
