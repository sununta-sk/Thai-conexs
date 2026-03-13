// src/components/IncognitoModal.jsx
import { useState } from 'react'
import { useIncognito } from '../hooks/useIncognito'

const DURATIONS = [
  { value: '1h',      label: '1 ชั่วโมง',   icon: '⚡' },
  { value: '6h',      label: '6 ชั่วโมง',   icon: '🌙' },
  { value: '24h',     label: '24 ชั่วโมง',  icon: '🌑' },
  { value: 'forever', label: 'ตลอดไป',      icon: '∞'  },
]

export default function IncognitoModal({ onClose }) {
  const { incognito, duration, timeLeft, toggling, toggle } = useIncognito()
  const [selected, setSelected] = useState(duration || '1h')
  const [result, setResult]     = useState(null)

  const handleToggle = async () => {
    const res = await toggle(incognito ? 'off' : selected)
    setResult(res)
    if (res.success) setTimeout(onClose, 1200)
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.iconWrap}>
            <span style={S.bigIcon}>{incognito ? '🕵️' : '👁️'}</span>
            {incognito && <span style={S.pulse} />}
          </div>
          <h2 style={S.title}>Incognito Mode</h2>
          <p style={S.subtitle}>
            {incognito
              ? 'คุณกำลังซ่อนตัวอยู่ — ไม่ปรากฏใน Discover & Search'
              : 'ซ่อนตัวจาก Discover & Search ชั่วคราว'}
          </p>
        </div>

        {/* Active Status */}
        {incognito && (
          <div style={S.statusCard}>
            <div style={S.statusRow}>
              <span style={S.statusDot} />
              <span style={S.statusText}>กำลังซ่อนตัว</span>
              {timeLeft && <span style={S.countdown}>{timeLeft}</span>}
            </div>
            <p style={S.statusSub}>
              {duration === 'forever' ? 'ไม่มีกำหนดหมดอายุ' : `หมดอายุใน ${timeLeft}`}
            </p>
          </div>
        )}

        {/* Duration Picker (แสดงเฉพาะตอนปิดอยู่) */}
        {!incognito && (
          <>
            <p style={S.label}>เลือกระยะเวลา</p>
            <div style={S.grid}>
              {DURATIONS.map(d => (
                <button
                  key={d.value}
                  style={{
                    ...S.option,
                    ...(selected === d.value ? S.optionActive : {}),
                  }}
                  onClick={() => setSelected(d.value)}
                >
                  <span style={S.optionIcon}>{d.icon}</span>
                  <span style={S.optionLabel}>{d.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Features List */}
        <div style={S.features}>
          {[
            'ไม่ปรากฏใน Discover Feed',
            'ไม่ปรากฏในผลการค้นหา',
            'คนอื่นยังคุยด้วยได้ถ้ารู้ link โดยตรง',
            'เปิด/ปิดได้ตลอดเวลา',
          ].map(f => (
            <div key={f} style={S.featureRow}>
              <span style={S.featureCheck}>✓</span>
              <span style={S.featureText}>{f}</span>
            </div>
          ))}
        </div>

        {/* Result */}
        {result && (
          <div style={{ ...S.toast, ...(result.success ? S.toastOk : S.toastErr) }}>
            {result.success
              ? incognito ? '🟢 เปิด Incognito แล้ว' : '⚫ ปิด Incognito แล้ว'
              : result.error === 'subscription_required'
              ? '⚠️ ฟีเจอร์นี้สำหรับ Subscriber เท่านั้น'
              : `❌ ${result.error}`}
          </div>
        )}

        {/* Actions */}
        <div style={S.actions}>
          <button style={S.cancel} onClick={onClose}>ยกเลิก</button>
          <button
            style={{
              ...S.confirm,
              ...(incognito ? S.confirmOff : S.confirmOn),
              opacity: toggling ? 0.6 : 1,
            }}
            onClick={handleToggle}
            disabled={toggling}
          >
            {toggling
              ? 'กำลังดำเนินการ...'
              : incognito
              ? '🔴 ปิด Incognito'
              : '🕵️ เปิด Incognito'}
          </button>
        </div>
      </div>
    </div>
  )
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, backdropFilter: 'blur(6px)',
  },
  modal: {
    background: '#1e293b', borderRadius: 20, padding: 32,
    width: '100%', maxWidth: 440, border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
  },
  header: { textAlign: 'center', marginBottom: 24 },
  iconWrap: { position: 'relative', display: 'inline-block', marginBottom: 12 },
  bigIcon: { fontSize: 52 },
  pulse: {
    position: 'absolute', top: -4, right: -4,
    width: 14, height: 14, borderRadius: '50%',
    background: '#e91e63',
    animation: 'pulse 1.5s ease-in-out infinite',
    boxShadow: '0 0 0 0 rgba(233,30,99,0.7)',
  },
  title: { margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#f1f5f9' },
  subtitle: { margin: 0, fontSize: 14, color: '#94a3b8' },

  statusCard: {
    background: 'rgba(233,30,99,0.1)', border: '1px solid rgba(233,30,99,0.3)',
    borderRadius: 12, padding: '12px 16px', marginBottom: 20,
  },
  statusRow: { display: 'flex', alignItems: 'center', gap: 8 },
  statusDot: {
    width: 10, height: 10, borderRadius: '50%', background: '#e91e63',
    boxShadow: '0 0 8px #e91e63',
  },
  statusText: { fontWeight: 600, color: '#f1f5f9', fontSize: 14 },
  countdown: {
    marginLeft: 'auto', fontSize: 13, color: '#e91e63',
    fontFamily: 'monospace', fontWeight: 700,
  },
  statusSub: { margin: '6px 0 0', fontSize: 12, color: '#94a3b8' },

  label: { fontSize: 13, color: '#94a3b8', marginBottom: 10, fontWeight: 500 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 },
  option: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: '12px 16px', cursor: 'pointer',
    transition: 'all 0.2s', color: '#cbd5e1',
  },
  optionActive: {
    background: 'rgba(233,30,99,0.15)', border: '1px solid rgba(233,30,99,0.5)',
    color: '#f1f5f9',
  },
  optionIcon: { fontSize: 20 },
  optionLabel: { fontSize: 13, fontWeight: 500 },

  features: {
    background: 'rgba(255,255,255,0.03)', borderRadius: 12,
    padding: '12px 16px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8,
  },
  featureRow: { display: 'flex', alignItems: 'center', gap: 10 },
  featureCheck: { color: '#10b981', fontSize: 14, fontWeight: 700 },
  featureText: { fontSize: 13, color: '#94a3b8' },

  toast: {
    borderRadius: 10, padding: '10px 14px', fontSize: 13,
    marginBottom: 16, textAlign: 'center',
  },
  toastOk:  { background: 'rgba(16,185,129,0.15)', color: '#10b981' },
  toastErr: { background: 'rgba(239,68,68,0.15)',  color: '#f87171' },

  actions: { display: 'flex', gap: 10 },
  cancel: {
    flex: 1, padding: '12px 0', borderRadius: 12,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  confirm: {
    flex: 2, padding: '12px 0', borderRadius: 12, border: 'none',
    fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s',
  },
  confirmOn: { background: 'linear-gradient(135deg,#e91e63,#9c27b0)', color: '#fff' },
  confirmOff:{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)' },
}