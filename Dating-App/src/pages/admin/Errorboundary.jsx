// src/components/admin/ErrorBoundary.jsx
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[AdminErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', gap: 16, padding: 40,
        fontFamily: "'Segoe UI', sans-serif",
      }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h2 style={{ color: '#f1f5f9', margin: 0, fontSize: 20, fontWeight: 700 }}>
          Something went wrong
        </h2>
        <p style={{ color: '#64748b', margin: 0, fontSize: 14, textAlign: 'center', maxWidth: 400 }}>
          {this.state.error?.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด'}
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: '#e91e63', color: '#fff',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            ลองใหม่
          </button>
          <button
            onClick={() => window.location.href = '/admin/dashboard'}
            style={{
              padding: '9px 20px', borderRadius: 8,
              border: '1px solid #1e293b', background: 'none',
              color: '#94a3b8', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            กลับ Dashboard
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <pre style={{
            marginTop: 16, padding: '12px 16px',
            background: '#1e293b', borderRadius: 8,
            color: '#f87171', fontSize: 11,
            maxWidth: 600, overflow: 'auto',
            maxHeight: 200,
          }}>
            {this.state.error?.stack}
          </pre>
        )}
      </div>
    );
  }
}