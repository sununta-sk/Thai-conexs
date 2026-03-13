// src/components/IncognitoButton.jsx
import { useState } from 'react'
import { useIncognito } from '../hooks/useIncognito'
import IncognitoModal from './IncognitoModal'

export default function IncognitoButton({ compact = false }) {
  const { incognito, timeLeft, loading } = useIncognito()
  const [open, setOpen] = useState(false)

  if (loading) return null

  return (
    <>
      <button
        style={{
          ...S.btn,
          ...(incognito ? S.btnActive : S.btnIdle),
          ...(compact ? S.btnCompact : {}),
        }}
        onClick={() => setOpen(true)}
        title={incognito ? 'Incognito กำลังทำงาน' : 'เปิด Incognito Mode'}
      >
        <span style={S.icon}>{incognito ? '🕵️' : '👁️'}</span>
        {!compact && (
          <span style={S.label}>
            {incognito ? (timeLeft ? `${timeLeft}` : 'Incognito') : 'Incognito'}
          </span>
        )}
        {incognito && <span style={S.dot} />}
      </button>

      {open && <IncognitoModal onClose={() => setOpen(false)} />}
    </>
  )
}

const S = {
  btn: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '8px 16px', borderRadius: 12,
    border: '1px solid transparent', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, position: 'relative',
    transition: 'all 0.2s',
  },
  btnIdle: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#94a3b8',
  },
  btnActive: {
    background: 'rgba(233,30,99,0.15)',
    border: '1px solid rgba(233,30,99,0.4)',
    color: '#e91e63',
  },
  btnCompact: { padding: '8px 10px' },
  icon: { fontSize: 16 },
  label: { fontSize: 13 },
  dot: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, borderRadius: '50%',
    background: '#e91e63',
    boxShadow: '0 0 6px #e91e63',
  },
}