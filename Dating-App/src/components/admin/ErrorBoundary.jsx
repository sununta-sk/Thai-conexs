import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh',
        background: '#f9fafb', fontFamily: 'system-ui, sans-serif', padding: 32,
      }}>
        <div style={{
          background: '#fff', border: '1px solid #fecaca', borderRadius: 16,
          padding: '40px 48px', maxWidth: 480, textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#111' }}>
            Something went wrong
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#111', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Try Again
            </button>
            <button onClick={() => window.location.href = '/admin/dashboard'}
              style={{ padding: '10px 24px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Dashboard
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details style={{ marginTop: 24, textAlign: 'left' }}>
              <summary style={{ fontSize: 12, color: '#9ca3af', cursor: 'pointer' }}>Stack trace</summary>
              <pre style={{ marginTop: 10, fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: 12, borderRadius: 8, overflow: 'auto', maxHeight: 200, lineHeight: 1.5 }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}