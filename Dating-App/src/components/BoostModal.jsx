// src/components/BoostModal.jsx
// Phase 6A — Boost Profile Modal
// Dark theme: #0f172a / #1e293b | Accent: #e91e63

import { useState, useEffect } from 'react'
import { useBoost, formatCountdown } from '../hooks/useBoost'

const DURATIONS = [
  { hours: 1,  label: '1 ชั่วโมง',   price: 'ฟรี', desc: 'ลองใช้งาน' },
  { hours: 6,  label: '6 ชั่วโมง',   price: 'ฟรี', desc: 'แนะนำ ⭐',  highlight: true },
  { hours: 24, label: '24 ชั่วโมง',  price: 'ฟรี', desc: 'สูงสุด' },
]

export default function BoostModal({ userId, isOpen, onClose }) {
  const [selected, setSelected] = useState(6)
  const { boost, timeLeft, isActive, loading, activating, error, activateBoost } = useBoost(userId)

  // Reset selection when modal opens
  useEffect(() => { if (isOpen) setSelected(6) }, [isOpen])

  if (!isOpen) return null

  const handleActivate = async () => {
    await activateBoost(selected)
  }

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>

        {/* ── Header ── */}
        <div style={S.header}>
          <div style={S.rocketWrap}>
            <span style={S.rocket}>🚀</span>
            <div style={S.glow} />
          </div>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        <h2 style={S.title}>Boost โปรไฟล์</h2>
        <p style={S.subtitle}>
          ขึ้นอันดับต้นใน Discover &amp; Search<br />
          ให้คนเห็นคุณมากขึ้น
        </p>

        {/* ── Active boost state ── */}
        {isActive ? (
          <ActiveBoostView timeLeft={timeLeft} boost={boost} />
        ) : (
          <>
            {/* ── Duration picker ── */}
            <div style={S.durationGrid}>
              {DURATIONS.map(d => (
                <button
                  key={d.hours}
                  style={{
                    ...S.durationCard,
                    ...(selected === d.hours ? S.durationCardActive : {}),
                    ...(d.highlight ? S.durationCardHighlight : {}),
                  }}
                  onClick={() => setSelected(d.hours)}
                >
                  {d.highlight && <span style={S.popularBadge}>ยอดนิยม</span>}
                  <span style={S.durationHours}>{d.label}</span>
                  <span style={S.durationDesc}>{d.desc}</span>
                  {selected === d.hours && <span style={S.checkmark}>✓</span>}
                </button>
              ))}
            </div>

            {/* ── How it works ── */}
            <div style={S.infoBox}>
              <InfoRow icon="📍" text="โปรไฟล์ของคุณจะปรากฏอันดับต้นๆ ของทุกคน" />
              <InfoRow icon="🔒" text="ต้องมี Subscription plan เพื่อใช้ฟีเจอร์นี้" />
              <InfoRow icon="⏱" text="Boost จะหมดอายุอัตโนมัติตาม duration ที่เลือก" />
            </div>

            {/* ── Error ── */}
            {error && <p style={S.error}>{error}</p>}

            {/* ── CTA ── */}
            <button
              style={{ ...S.ctaBtn, ...(activating ? S.ctaBtnDisabled : {}) }}
              onClick={handleActivate}
              disabled={activating || loading}
            >
              {activating ? (
                <span style={S.spinner} />
              ) : (
                <>🚀 เริ่ม Boost เลย</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────

function ActiveBoostView({ timeLeft, boost }) {
  const pct = boost
    ? Math.max(0, Math.min(100,
        (new Date(boost.expires_at) - Date.now()) /
        (boost.duration_hours * 3600 * 1000) * 100
      ))
    : 0

  return (
    <div style={S.activeWrap}>
      <div style={S.pulseRing} />
      <p style={S.activeLabel}>Boost กำลังทำงาน</p>
      <p style={S.countdown}>{formatCountdown(timeLeft)}</p>
      <div style={S.progressBar}>
        <div style={{ ...S.progressFill, width: `${pct}%` }} />
      </div>
      <p style={S.activeHint}>
        โปรไฟล์ของคุณอยู่อันดับต้นของ Discover แล้ว ✨
      </p>
    </div>
  )
}

function InfoRow({ icon, text }) {
  return (
    <div style={S.infoRow}>
      <span style={S.infoIcon}>{icon}</span>
      <span style={S.infoText}>{text}</span>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────
const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  },
  modal: {
    background: '#1e293b',
    borderRadius: '24px',
    padding: '28px 24px 32px',
    width: '100%',
    maxWidth: '400px',
    position: 'relative',
    border: '1px solid rgba(233,30,99,0.25)',
    boxShadow: '0 0 60px rgba(233,30,99,0.15), 0 24px 48px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex', justifyContent: 'center',
    marginBottom: '4px',
    position: 'relative',
  },
  rocketWrap: {
    position: 'relative', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  rocket: {
    fontSize: '52px',
    filter: 'drop-shadow(0 0 16px #e91e63)',
    animation: 'boostFloat 2s ease-in-out infinite',
  },
  glow: {
    position: 'absolute', inset: '-8px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(233,30,99,0.3) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  closeBtn: {
    position: 'absolute', right: 0, top: 0,
    background: 'rgba(255,255,255,0.08)',
    border: 'none', color: '#94a3b8',
    borderRadius: '50%', width: '32px', height: '32px',
    cursor: 'pointer', fontSize: '14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    textAlign: 'center', margin: '8px 0 6px',
    fontSize: '22px', fontWeight: 700,
    color: '#f1f5f9',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    textAlign: 'center', margin: '0 0 20px',
    fontSize: '13.5px', color: '#94a3b8',
    lineHeight: 1.6,
  },

  // Duration picker
  durationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginBottom: '18px',
  },
  durationCard: {
    background: '#0f172a',
    border: '1.5px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '14px 8px',
    cursor: 'pointer',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '4px',
    position: 'relative',
    transition: 'all 0.18s ease',
    color: '#cbd5e1',
  },
  durationCardActive: {
    border: '1.5px solid #e91e63',
    background: 'rgba(233,30,99,0.1)',
    boxShadow: '0 0 18px rgba(233,30,99,0.2)',
    color: '#f1f5f9',
  },
  durationCardHighlight: {
    border: '1.5px solid rgba(233,30,99,0.4)',
  },
  popularBadge: {
    position: 'absolute', top: '-9px',
    background: '#e91e63',
    color: '#fff',
    fontSize: '9px', fontWeight: 700,
    padding: '2px 7px', borderRadius: '99px',
    letterSpacing: '0.3px',
  },
  durationHours: {
    fontSize: '13px', fontWeight: 700,
    marginTop: '2px',
  },
  durationDesc: {
    fontSize: '11px', color: '#64748b',
  },
  checkmark: {
    position: 'absolute', top: '8px', right: '10px',
    color: '#e91e63', fontSize: '12px', fontWeight: 800,
  },

  // Info box
  infoBox: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '12px 14px',
    marginBottom: '18px',
    display: 'flex', flexDirection: 'column', gap: '8px',
  },
  infoRow: {
    display: 'flex', alignItems: 'flex-start', gap: '10px',
  },
  infoIcon: { fontSize: '14px', flexShrink: 0, marginTop: '1px' },
  infoText: { fontSize: '12.5px', color: '#94a3b8', lineHeight: 1.5 },

  // Error
  error: {
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#fca5a5',
    fontSize: '13px',
    marginBottom: '14px',
    textAlign: 'center',
  },

  // CTA button
  ctaBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #e91e63, #c2185b)',
    border: 'none',
    borderRadius: '14px',
    color: '#fff',
    fontSize: '15px', fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.2px',
    boxShadow: '0 4px 24px rgba(233,30,99,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    transition: 'opacity 0.2s',
  },
  ctaBtnDisabled: {
    opacity: 0.6, cursor: 'not-allowed',
  },
  spinner: {
    width: '18px', height: '18px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
  },

  // Active boost view
  activeWrap: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '10px',
    padding: '8px 0 4px',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute', top: '-4px',
    width: '80px', height: '80px',
    borderRadius: '50%',
    border: '2px solid #e91e63',
    opacity: 0.5,
    animation: 'pulse 1.5s ease-out infinite',
  },
  activeLabel: {
    fontSize: '12px', fontWeight: 600,
    color: '#e91e63',
    textTransform: 'uppercase', letterSpacing: '1.5px',
    marginBottom: '0',
  },
  countdown: {
    fontSize: '42px', fontWeight: 800,
    color: '#f1f5f9',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-1px',
    margin: '0',
    fontFamily: 'monospace',
  },
  progressBar: {
    width: '100%', height: '6px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '99px',
    overflow: 'hidden',
    marginTop: '4px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #e91e63, #f06292)',
    borderRadius: '99px',
    transition: 'width 1s linear',
  },
  activeHint: {
    fontSize: '13px', color: '#94a3b8',
    textAlign: 'center', marginTop: '2px',
  },
}

/*
  Add these keyframes once to your global CSS (e.g. index.css):

  @keyframes boostFloat {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-6px); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%   { transform: scale(0.9); opacity: 0.6; }
    70%  { transform: scale(1.4); opacity: 0;   }
    100% { transform: scale(1.4); opacity: 0;   }
  }
*/