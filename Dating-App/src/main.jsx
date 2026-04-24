import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import ErrorBoundary from './components/admin/ErrorBoundary'
import { assertNoServiceRoleKey, injectCSP } from './utils/security'

// ── Phase 8: Security hardening ──────────────────────────────────────────────
assertNoServiceRoleKey()  // throws in prod if service_role key found in client env
injectCSP()               // injects CSP meta tag as fallback

// ── Mount ────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)