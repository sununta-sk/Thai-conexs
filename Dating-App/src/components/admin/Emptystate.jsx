import { memo } from 'react'
import { Inbox, Search, AlertCircle, Users, FileText, Image, DollarSign } from 'lucide-react'

const PRESETS = {
  default:  { icon: Inbox,       title: 'ไม่มีข้อมูล',              desc: 'ยังไม่มีรายการในระบบ' },
  search:   { icon: Search,      title: 'ไม่พบผลการค้นหา',          desc: 'ลองเปลี่ยนคำค้นหาหรือ filter ใหม่' },
  error:    { icon: AlertCircle, title: 'เกิดข้อผิดพลาด',           desc: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่' },
  users:    { icon: Users,       title: 'ยังไม่มีผู้ใช้',           desc: 'ผู้ใช้จะแสดงที่นี่เมื่อมีการลงทะเบียน' },
  tickets:  { icon: FileText,    title: 'ไม่มี Ticket ที่เปิดอยู่', desc: 'Ticket ใหม่จะแสดงที่นี่' },
  photos:   { icon: Image,       title: 'ไม่มีรูปรอตรวจสอบ',        desc: 'รูปภาพที่รอการอนุมัติจะแสดงที่นี่' },
  payouts:  { icon: DollarSign,  title: 'ไม่มีคำขอ Payout',         desc: 'คำขอ Payout จาก Affiliate จะแสดงที่นี่' },
}

const EmptyState = memo(function EmptyState({
  preset = 'default', title, desc, onAction, actionLabel, compact = false,
}) {
  const p = PRESETS[preset] || PRESETS.default
  const Icon = p.icon
  const isError = preset === 'error'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center',
      padding: compact ? '32px 24px' : '64px 32px', gap: compact ? 10 : 14,
    }}>
      <div style={{
        width: compact ? 48 : 64, height: compact ? 48 : 64, borderRadius: '50%',
        background: isError ? '#fef2f2' : '#f9fafb',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
      }}>
        <Icon size={compact ? 22 : 28} color={isError ? '#ef4444' : '#9ca3af'} strokeWidth={1.5} />
      </div>
      <div>
        <p style={{ margin: '0 0 6px', fontSize: compact ? 14 : 16, fontWeight: 700, color: '#111' }}>
          {title || p.title}
        </p>
        <p style={{ margin: 0, fontSize: compact ? 12 : 14, color: '#9ca3af', lineHeight: 1.6, maxWidth: 280 }}>
          {desc || p.desc}
        </p>
      </div>
      {onAction && (
        <button onClick={onAction} style={{
          marginTop: 4, padding: '9px 20px', borderRadius: 8,
          border: isError ? 'none' : '1.5px solid #e5e7eb',
          background: isError ? '#ef4444' : '#fff',
          color: isError ? '#fff' : '#374151',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          {actionLabel || (isError ? 'ลองใหม่' : 'เพิ่มรายการ')}
        </button>
      )}
    </div>
  )
})

export default EmptyState