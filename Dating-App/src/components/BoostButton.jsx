// src/components/BoostButton.jsx
// Phase 6A — Drop-in Boost trigger button
// Usage: <BoostButton userId={currentUser.id} />

import { useState } from 'react'
import BoostModal from './BoostModal'
import { useBoost, formatCountdown } from '../hooks/useBoost'

export default function BoostButton({ userId }) {
  const [open, setOpen] = useState(false)
  const { isActive, timeLeft } = useBoost(userId)

  return (
    <>
      <button
        style={{ ...S.btn, ...(isActive ? S.btnActive : {}) }}
        onClick={() => setOpen(true)}
        title={isActive ? `Boost หมดใน ${formatCountdown(timeLeft)}` : 'เปิดใช้ Boost'}
      >
        <span style={S.icon}>🚀</span>
        {isActive ? (
          <span style={S.label}>
            {formatCountdown(timeLeft)}
          </span>
        ) : (
          <span style={S.label}>Boost</span>
        )}
        {isActive && <span style={S.activeDot} />}
      </button>

      <BoostModal
        userId={userId}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

const S = {
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 16px',
    borderRadius: '99px',
    border: '1.5px solid rgba(233,30,99,0.4)',
    background: 'rgba(233,30,99,0.08)',
    color: '#e91e63',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.18s ease',
  },
  btnActive: {
    background: 'rgba(233,30,99,0.15)',
    border: '1.5px solid #e91e63',
    boxShadow: '0 0 14px rgba(233,30,99,0.25)',
  },
  icon: { fontSize: '15px' },
  label: {
    fontVariantNumeric: 'tabular-nums',
    fontFamily: 'inherit',
  },
  activeDot: {
    position: 'absolute',
    top: '5px', right: '5px',
    width: '7px', height: '7px',
    borderRadius: '50%',
    background: '#e91e63',
    boxShadow: '0 0 6px #e91e63',
  },
}