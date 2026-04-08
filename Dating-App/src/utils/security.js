/**
 * security.js — Phase 8 Security & Performance
 *
 * 1. Runtime guard: throws if service_role key is detected in client bundle
 * 2. CSP meta tag injection (for apps that can't set HTTP headers)
 * 3. React.memo + useMemo patterns for DataTable performance
 */

// ── 1. SERVICE_ROLE KEY GUARD ─────────────────────────────────────────────────
// Call this once in main.jsx / App.jsx entry point
export function assertNoServiceRoleKey() {
    const env = import.meta?.env || {}
  
    const DANGEROUS_PATTERNS = [
      /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJyb2xlIjoic2VydmljZV9yb2xlIi/,
      /service_role/i,
    ]
  
    const keysToCheck = [
      env.VITE_SUPABASE_SERVICE_ROLE_KEY,
      env.VITE_SUPABASE_ANON_KEY,
      env.SUPABASE_SERVICE_ROLE_KEY,
    ].filter(Boolean)
  
    for (const key of keysToCheck) {
      for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(key)) {
          const msg = '[SECURITY] service_role key detected in client bundle! Remove it immediately from .env VITE_ variables.'
          console.error(msg)
          if (import.meta?.env?.PROD) {
            // Hard stop in production
            document.body.innerHTML = `<div style="padding:40px;font-family:monospace;color:red;background:#fff">
              <h2>⛔ Security Configuration Error</h2>
              <p>service_role key must never be exposed to the client.</p>
            </div>`
            throw new Error(msg)
          }
        }
      }
    }
  }
  
  // ── 2. CSP INJECTION (fallback when HTTP headers not available) ───────────────
  // Call injectCSP() in main.jsx for Vite dev / static hosting without header control
  export function injectCSP() {
    if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return
  
    const supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL || 'https://*.supabase.co'
    const supabaseHost = supabaseUrl.replace(/^https?:\/\//, '').split('/')[0]
  
    const policy = [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,  // unsafe-inline needed for Vite dev
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: blob: https://${supabaseHost} https://www.google.com https://lh3.googleusercontent.com`,
      `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://thai-conexs-production.up.railway.app wss://thai-conexs-production.up.railway.app https://api.anthropic.com`,
      `frame-src 'none'`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
    ].join('; ')
  
    const meta = document.createElement('meta')
    meta.httpEquiv = 'Content-Security-Policy'
    meta.content = policy
    document.head.appendChild(meta)
  }
  
  // ── 3. PERFORMANCE HELPERS ────────────────────────────────────────────────────
  
  /**
   * useTableColumns
   * Wraps column definitions in useMemo to prevent re-renders.
   *
   * Usage in any DataTable page:
   *   const columns = useTableColumns(() => [
   *     { key: 'name', header: 'Name', render: row => row.name },
   *   ], [dependency])
   */
  export { useMemo as useTableColumns } from 'react'
  
  /**
   * getRowKey
   * Stable row key for React lists — avoids index-based keys.
   */
  export function getRowKey(row) {
    return row.id || row.uuid || JSON.stringify(row)
  }
  
  /**
   * Recommended memo wrapper pattern for DataTable rows.
   *
   * Example:
   *   const MemoRow = memo(TableRow, (prev, next) => prev.row.id === next.row.id && prev.row.updated_at === next.row.updated_at)
   *
   * Import React.memo from 'react' and apply to your row component.
   */
  export const MEMO_ROW_TIP = `
  // Wrap your row component with React.memo and a custom comparison:
  const MemoRow = React.memo(RowComponent, (prev, next) =>
    prev.row.id === next.row.id &&
    prev.row.updated_at === next.row.updated_at
  )
  `
  
  // ── 4. VITE CONFIG HINT ───────────────────────────────────────────────────────
  // Add to vite.config.js → server.headers for local dev CSP:
  export const VITE_CSP_HEADERS_HINT = `
  // vite.config.js
  export default {
    server: {
      headers: {
        'Content-Security-Policy': "default-src 'self'; connect-src 'self' wss://*.supabase.co https://*.supabase.co; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://*.supabase.co",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      }
    }
  }
  `