// src/components/BoostButton.jsx
// Phase 6A — Drop-in Boost trigger button
// Usage: <BoostButton userId={currentUser.id} />

import { useState } from 'react'
import BoostModal from './BoostModal'
import { useBoost, formatCountdown } from '../hooks/useBoost'

export default function BoostButton({ userId, size = 'md' }) {
  const [open, setOpen] = useState(false)
  // Single shared useBoost instance for this button + the modal it opens -
  // BoostModal used to call its own separate instance, so activating a
  // boost from inside the modal never updated this button's own label
  // until a full remount (page refresh). Passing the same state/actions
  // down as props instead of letting the modal fetch its own copy fixes
  // that: one source of truth, updates both immediately.
  const { boost, timeLeft, isActive, loading, activating, error, activateBoost } = useBoost(userId)
  const sizeStyle = size === 'lg' ? S.btnLg : {}

  return (
    <>
      <button
        style={{ ...S.btn, ...sizeStyle, ...(isActive ? S.btnActive : {}) }}
        onClick={() => setOpen(true)}
        title={isActive ? `Boost หมดใน ${formatCountdown(timeLeft)}` : 'เปิดใช้ Boost'}
      >
        <span style={size === 'lg' ? S.iconLg : S.icon}>🚀</span>
        {isActive ? (
          <span style={size === 'lg' ? S.labelLg : S.label}>
            {formatCountdown(timeLeft)}
          </span>
        ) : (
          <span style={size === 'lg' ? S.labelLg : S.label}>Boost</span>
        )}
        {isActive && <span style={S.activeDot} />}
      </button>

      <BoostModal
        isOpen={open}
        onClose={() => setOpen(false)}
        boost={boost}
        timeLeft={timeLeft}
        isActive={isActive}
        loading={loading}
        activating={activating}
        error={error}
        activateBoost={activateBoost}
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
  btnLg: {
    padding: '16px 28px',
    fontSize: '16px',
    borderRadius: '16px',
    width: '100%',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(233,30,99,0.3)',
  },
  iconLg: { fontSize: '22px' },
  labelLg: {
    fontVariantNumeric: 'tabular-nums',
    fontFamily: 'inherit',
    fontWeight: 800,
  },
}