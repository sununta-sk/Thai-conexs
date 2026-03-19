// src/components/admin/TableSkeleton.jsx
// Loading skeleton แทน spinner ใน DataTable ทุกหน้า

export default function TableSkeleton({ rows = 8, cols = 5 }) {
    return (
      <div style={{ width: '100%' }}>
        {/* Header skeleton */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 12, padding: '12px 16px',
          background: '#0f172a',
          borderBottom: '1px solid #1e293b',
        }}>
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} style={{ ...S.shimmer, height: 12, width: '60%', borderRadius: 6 }} />
          ))}
        </div>
  
        {/* Row skeletons */}
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 12, padding: '14px 16px',
            borderBottom: '1px solid #0f172a',
            background: row % 2 === 0 ? '#1e293b' : '#192236',
            alignItems: 'center',
          }}>
            {Array.from({ length: cols }).map((_, col) => (
              <div key={col} style={{
                ...S.shimmer,
                height: col === 0 ? 36 : 12,
                width: col === 0 ? 36 : `${50 + Math.random() * 40}%`,
                borderRadius: col === 0 ? '50%' : 6,
              }} />
            ))}
          </div>
        ))}
      </div>
    );
  }
  
  // Inline shimmer for single values (e.g. stat cards)
  export function SkeletonText({ width = '80%', height = 14 }) {
    return <div style={{ ...S.shimmer, height, width, borderRadius: 6 }} />;
  }
  
  export function SkeletonCard() {
    return (
      <div style={{
        background: '#1e293b', borderRadius: 12,
        padding: '20px 24px', border: '1px solid #334155',
      }}>
        <SkeletonText width="40%" height={12} />
        <div style={{ marginTop: 12 }}><SkeletonText width="55%" height={28} /></div>
        <div style={{ marginTop: 10 }}><SkeletonText width="30%" height={11} /></div>
      </div>
    );
  }
  
  // ── Shimmer animation via CSS-in-JS ─────────────────────────────────────────
  const shimmerKeyframes = `
    @keyframes shimmer {
      0%   { background-position: -600px 0; }
      100% { background-position:  600px 0; }
    }
  `;
  
  if (typeof document !== 'undefined' && !document.getElementById('shimmer-style')) {
    const style = document.createElement('style');
    style.id = 'shimmer-style';
    style.textContent = shimmerKeyframes;
    document.head.appendChild(style);
  }
  
  const S = {
    shimmer: {
      background: 'linear-gradient(90deg, #1e293b 25%, #2d3f55 50%, #1e293b 75%)',
      backgroundSize: '600px 100%',
      animation: 'shimmer 1.4s infinite linear',
    },
  };