// src/components/AdminLayout.jsx — Phase 8
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { useRealtimeBadges } from '../hooks/useRealtimeBadges';
import ErrorBoundary from './admin/ErrorBoundary';

const NAV_ITEMS = [
  { icon: '📊', label: 'Dashboard',     path: '/admin/dashboard',              module: null },
  { icon: '👥', label: 'Users',         path: '/admin/users',                  module: 'users' },
  { icon: '🛡️', label: 'Photos',       path: '/admin/moderation/photos',      module: 'content', badge: 'photos' },
  { icon: '🚩', label: 'Reports',       path: '/admin/moderation/reports',     module: 'content' },
  { icon: '🎫', label: 'Tickets',       path: '/admin/moderation/tickets',     module: 'content', badge: 'tickets' },
  { icon: '🤝', label: 'Affiliates',    path: '/admin/affiliates',             module: 'affiliates' },
  { icon: '💸', label: 'Payouts',       path: '/admin/payouts',                module: 'affiliates' },
  { icon: '💰', label: 'Revenue',       path: '/admin/revenue',                module: 'finance' },
  { icon: '📋', label: 'Subscriptions', path: '/admin/subscriptions',          module: 'finance' },
  { icon: '📊', label: 'Analytics',     path: '/admin/analytics',              module: 'finance' },
  { icon: '⚙️', label: 'Settings',     path: '/admin/platform/settings',      module: 'platform' },
  { icon: '📢', label: 'Announcements', path: '/admin/platform/announcements', module: 'platform' },
  { icon: '👤', label: 'Team',          path: '/admin/team',                   module: 'platform' },
  { icon: '📜', label: 'Audit Log',     path: '/admin/audit-log',              module: 'platform' },
];

const ROLE_COLORS = {
  super_admin:       '#e91e63',
  content_moderator: '#3b82f6',
  affiliate_manager: '#8b5cf6',
  finance_viewer:    '#10b981',
};

// ── Breadcrumb builder ────────────────────────────────────────────────────────
function getBreadcrumb(pathname) {
  const map = {
    '/admin/dashboard':              ['Dashboard'],
    '/admin/users':                  ['Users'],
    '/admin/moderation/photos':      ['Moderation', 'Photos'],
    '/admin/moderation/reports':     ['Moderation', 'Reports'],
    '/admin/moderation/tickets':     ['Moderation', 'Tickets'],
    '/admin/affiliates':             ['Affiliates'],
    '/admin/payouts':                ['Affiliates', 'Payouts'],
    '/admin/revenue':                ['Finance', 'Revenue'],
    '/admin/subscriptions':          ['Finance', 'Subscriptions'],
    '/admin/analytics':              ['Finance', 'Analytics'],
    '/admin/platform/settings':      ['Platform', 'Settings'],
    '/admin/platform/announcements': ['Platform', 'Announcements'],
    '/admin/team':                   ['Platform', 'Team'],
    '/admin/audit-log':              ['Platform', 'Audit Log'],
  };
  // Dynamic paths e.g. /admin/users/:id
  if (pathname.match(/^\/admin\/users\/.+/))      return ['Users', 'Detail'];
  if (pathname.match(/^\/admin\/affiliates\/.+/)) return ['Affiliates', 'Detail'];
  return map[pathname] || ['Admin'];
}

export default function AdminLayout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { session, adminUser, role, loading, can } = useAdminAuth();
  const { pendingPhotos, openTickets } = useRealtimeBadges();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={S.fullScreen}>
        <div style={S.spinner} />
        <p style={{ color: '#64748b', marginTop: 12, fontSize: 13 }}>กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  if (!session) { navigate('/login'); return null; }

  if (!adminUser) {
    return (
      <div style={S.fullScreen}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <h2 style={{ color: '#f1f5f9', marginTop: 16, fontSize: 18 }}>Access Denied</h2>
        <p style={{ color: '#64748b', fontSize: 13 }}>บัญชีนี้ไม่มีสิทธิ์เข้า Admin Portal</p>
        <button onClick={() => navigate('/discover')} style={S.actionBtn}>กลับไปหน้าหลัก</button>
      </div>
    );
  }

  if (adminUser.is_active === false) {
    return (
      <div style={S.fullScreen}>
        <div style={{ fontSize: 48 }}>⏸️</div>
        <h2 style={{ color: '#f1f5f9', marginTop: 16, fontSize: 18 }}>Account Suspended</h2>
        <p style={{ color: '#64748b', fontSize: 13 }}>บัญชี Admin นี้ถูก suspend</p>
        <button onClick={handleSignOut} style={S.actionBtn}>Sign Out</button>
      </div>
    );
  }

  const roleName  = role?.name || 'admin';
  const roleColor = ROLE_COLORS[roleName] || '#64748b';
  const breadcrumb = getBreadcrumb(location.pathname);

  const getBadge = (item) => {
    if (item.badge === 'photos'  && pendingPhotos > 0) return pendingPhotos;
    if (item.badge === 'tickets' && openTickets   > 0) return openTickets;
    return null;
  };

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={S.logoRow}>
        <span style={{ fontSize: 20 }}>💞</span>
        <span style={S.logoText}>Thai Conexns</span>
      </div>
      <div style={S.portalLabel}>ADMIN PORTAL</div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        {NAV_ITEMS.map(item => {
          if (item.module && !can(item.module, 'read')) return null;

          const isActive =
            location.pathname === item.path ||
            (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));

          const badge = getBadge(item);

          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              style={{ ...S.navItem, ...(isActive ? S.navItemActive : {}) }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#cbd5e1'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#475569'; }}
            >
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {badge !== null && (
                <span style={{
                  background: '#e91e63', color: '#fff',
                  fontSize: 10, fontWeight: 800,
                  padding: '1px 6px', borderRadius: 20,
                  minWidth: 18, textAlign: 'center',
                  animation: 'pulse 2s infinite',
                }}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
              {isActive && <div style={S.activeBar} />}
            </button>
          );
        })}
      </nav>

      {/* Admin Info */}
      <div style={S.adminInfo}>
        <div style={{ ...S.badge, background: `${roleColor}22`, color: roleColor, border: `1px solid ${roleColor}44` }}>
          {roleName.replace(/_/g, ' ').toUpperCase()}
        </div>
        <div style={S.adminName}>{adminUser.display_name}</div>
        <div style={S.adminEmail}>{adminUser.email}</div>
        <button onClick={handleSignOut} style={S.signOutBtn}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#e91e63'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#1e293b'}
        >
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.7; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        /* Mobile sidebar overlay */
        .admin-sidebar-overlay {
          display: none;
        }
        @media (max-width: 768px) {
          .admin-sidebar-desktop { display: none !important; }
          .admin-mobile-toggle   { display: flex !important; }
          .admin-sidebar-overlay {
            display: block;
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 200;
          }
          .admin-sidebar-drawer {
            position: fixed; left: 0; top: 0; bottom: 0;
            width: 220px; z-index: 201;
            background: #0a0f1e;
            border-right: 1px solid #1e293b;
            transform: translateX(0);
            transition: transform 0.25s ease;
          }
        }
      `}</style>

      <div style={S.shell}>

        {/* ── Desktop Sidebar ── */}
        <aside className="admin-sidebar-desktop" style={S.sidebar}>
          <SidebarContent />
        </aside>

        {/* ── Mobile Sidebar ── */}
        {sidebarOpen && (
          <>
            <div className="admin-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            <div className="admin-sidebar-drawer"><SidebarContent /></div>
          </>
        )}

        {/* ── Main ── */}
        <main style={S.main}>
          {/* Header */}
          <div style={S.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Mobile hamburger */}
              <button
                className="admin-mobile-toggle"
                onClick={() => setSidebarOpen(true)}
                style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M3 6h18M3 18h18"/>
                </svg>
              </button>

              {/* Breadcrumb */}
              <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {breadcrumb.map((crumb, i) => (
                  <span key={crumb} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {i > 0 && <span style={{ color: '#334155', fontSize: 12 }}>›</span>}
                    <span style={{
                      fontSize: 13, fontWeight: i === breadcrumb.length - 1 ? 700 : 500,
                      color: i === breadcrumb.length - 1 ? '#f1f5f9' : '#475569',
                    }}>{crumb}</span>
                  </span>
                ))}
              </nav>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Realtime indicators */}
              {pendingPhotos > 0 && (
                <div style={S.headerBadge} title={`${pendingPhotos} photos pending`}>
                  📸 {pendingPhotos}
                </div>
              )}
              {openTickets > 0 && (
                <div style={{ ...S.headerBadge, background: '#7c3aed22', color: '#a78bfa', border: '1px solid #7c3aed44' }} title={`${openTickets} tickets open`}>
                  🎫 {openTickets}
                </div>
              )}

              {/* View App — กลับไปหน้า user */}
              <a
                href="/discover"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 8, textDecoration: 'none',
                  fontSize: 12, fontWeight: 700,
                  background: '#10b98118', color: '#34d399',
                  border: '1px solid #10b98140',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#10b98130'}
                onMouseLeave={e => e.currentTarget.style.background = '#10b98118'}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                </svg>
                View App
              </a>

              <span style={{ ...S.badge, background: `${roleColor}22`, color: roleColor, border: `1px solid ${roleColor}44` }}>
                {roleName.replace(/_/g, ' ')}
              </span>
              <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>
                {adminUser.display_name}
              </span>
            </div>
          </div>

          {/* Page content wrapped in ErrorBoundary */}
          <div style={S.content}>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  shell: {
    display: 'flex', height: '100vh', overflow: 'hidden',
    background: '#0f172a', fontFamily: "'Segoe UI', sans-serif",
  },
  sidebar: {
    width: 220, flexShrink: 0,
    background: '#0a0f1e',
    borderRight: '1px solid #1e293b',
    overflowY: 'auto',
  },
  logoRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '20px 20px 6px',
  },
  logoText: { color: '#f1f5f9', fontWeight: 800, fontSize: 15 },
  portalLabel: {
    fontSize: 9, color: '#334155', padding: '0 20px 14px',
    fontWeight: 700, letterSpacing: 1.2,
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '10px 20px',
    background: 'none', border: 'none',
    color: '#475569', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', textAlign: 'left',
    position: 'relative', transition: 'color 0.15s',
  },
  navItemActive: {
    color: '#f1f5f9',
    background: 'linear-gradient(to right, #1e293b, #162032)',
  },
  activeBar: {
    position: 'absolute', right: 0, top: '50%',
    transform: 'translateY(-50%)',
    width: 3, height: 20,
    background: '#e91e63', borderRadius: '2px 0 0 2px',
  },
  adminInfo: { padding: '12px 16px', borderTop: '1px solid #1e293b' },
  adminName:  { color: '#f1f5f9', fontWeight: 700, fontSize: 13, marginTop: 8 },
  adminEmail: { color: '#475569', fontSize: 11, marginTop: 2, marginBottom: 8 },
  badge: {
    display: 'inline-block', padding: '3px 8px',
    borderRadius: 20, fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  headerBadge: {
    background: '#e91e6322', color: '#f472b6',
    border: '1px solid #e91e6344',
    padding: '3px 10px', borderRadius: 20,
    fontSize: 12, fontWeight: 700,
    display: 'flex', alignItems: 'center', gap: 4,
  },
  signOutBtn: {
    width: '100%', background: 'none',
    border: '1px solid #1e293b', borderRadius: 8,
    padding: '7px 0', color: '#475569',
    fontSize: 12, cursor: 'pointer', fontWeight: 600,
    transition: 'border-color 0.15s',
  },
  main: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    height: 52, flexShrink: 0,
    background: '#0a0f1e',
    borderBottom: '1px solid #1e293b',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
  },
  content: {
    flex: 1, overflowY: 'auto', background: '#0f172a',
  },
  fullScreen: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: '#0f172a',
    fontFamily: "'Segoe UI', sans-serif", gap: 8,
  },
  spinner: {
    width: 32, height: 32,
    border: '3px solid #1e293b',
    borderTop: '3px solid #e91e63',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  actionBtn: {
    marginTop: 16, padding: '10px 24px',
    background: '#e91e63', border: 'none',
    borderRadius: 10, color: '#fff',
    fontWeight: 700, cursor: 'pointer', fontSize: 14,
  },
};