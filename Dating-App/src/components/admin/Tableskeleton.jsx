import { memo } from 'react'

const SHIMMER_STYLE = `
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
.sk { background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);
      background-size: 600px 100%; animation: shimmer 1.4s ease-in-out infinite; border-radius:6px; }
`

const Cell = ({ w = '70%', h = 13 }) => (
  <td style={{ padding: '14px 16px' }}>
    <div className="sk" style={{ height: h, width: w }} />
  </td>
)

const AvatarCell = () => (
  <td style={{ padding: '14px 16px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div className="sk" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="sk" style={{ height: 13, width: '60%' }} />
        <div className="sk" style={{ height: 11, width: '80%' }} />
      </div>
    </div>
  </td>
)

const WIDTHS = ['70%', '50%', '40%', '60%', '35%', '55%', '45%']

const TableSkeleton = memo(({ rows = 8, cols = 5, hasAvatar = true, headers = [] }) => (
  <>
    <style>{SHIMMER_STYLE}</style>
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
            {(headers.length ? headers : Array.from({ length: cols }, (_, i) => i)).map((h, i) => (
              <th key={i} style={{ padding: '12px 16px', textAlign: 'left' }}>
                {headers.length
                  ? <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280' }}>{h}</span>
                  : <div className="sk" style={{ height: 12, width: `${40 + i * 10}%` }} />
                }
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} style={{ borderBottom: r < rows - 1 ? '1px solid #f9fafb' : 'none' }}>
              {hasAvatar ? <AvatarCell /> : <Cell w={WIDTHS[r % WIDTHS.length]} />}
              {Array.from({ length: cols - 1 }).map((_, c) => (
                <Cell key={c} w={WIDTHS[(r + c + 1) % WIDTHS.length]} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
))

export default TableSkeleton

export const StatCardSkeleton = memo(({ count = 4 }) => (
  <>
    <style>{SHIMMER_STYLE}</style>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #f3f4f6' }}>
          <div className="sk" style={{ height: 11, width: '50%', marginBottom: 12 }} />
          <div className="sk" style={{ height: 28, width: '65%', marginBottom: 8 }} />
          <div className="sk" style={{ height: 10, width: '40%' }} />
        </div>
      ))}
    </div>
  </>
))