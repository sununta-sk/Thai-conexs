// src/components/admin/EmptyState.jsx

export default function EmptyState({
    icon = '📭',
    title = 'ไม่มีข้อมูล',
    description = '',
    action = null,   // { label: 'string', onClick: fn }
  }) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '64px 32px', gap: 12,
        fontFamily: "'Segoe UI', sans-serif",
      }}>
        <div style={{ fontSize: 44, lineHeight: 1 }}>{icon}</div>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
          {title}
        </h3>
        {description && (
          <p style={{ margin: 0, fontSize: 13, color: '#475569', textAlign: 'center', maxWidth: 320 }}>
            {description}
          </p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            style={{
              marginTop: 8, padding: '9px 22px',
              borderRadius: 8, border: 'none',
              background: '#e91e63', color: '#fff',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            {action.label}
          </button>
        )}
      </div>
    );
  }