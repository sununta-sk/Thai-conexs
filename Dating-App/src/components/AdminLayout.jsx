// src/components/AdminLayout.jsx
// Route guard + Sidebar + Header สำหรับ Admin Portal

import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAdminAuth } from '../hooks/useAdminAuth';

const NAV_ITEMS = [
  { icon: '📊', label: 'Dashboard',     path: '/admin-secret-portal',       module: null },
  { icon: '👥', label: 'Users',         path: '/admin/users',               module: 'users' },
  { icon: '🛡️', label: 'Moderation',   path: '/admin/moderation/photos',   module: 'content' },
  { icon: '🤝', label: 'Affiliates',    path: '/admin/affiliates',          module: 'affiliates' },
  { icon: '💰', label: 'Revenue',       path: '/admin/revenue',             module: 'finance' },
  { icon: '📋', label: 'Subscriptions', path: '/admin/subscriptions',       module: 'finance' },
  { icon: '⚙️', label: 'Platform',     path: '/admin/platform/settings',   module: 'platform' },
  { icon: '📢', label: 'Announcements', path: '/admin/platform/announcements', module: 'platform' },
  { icon: '👤', label: 'Team',          path: '/admin/team',                module: 'platform' },
  { icon: '📜', label: 'Audit Log',     path: '/admin/audit-log',           module: 'platform' },
];

export default function AdminLayout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { session, adminUser, role, loading, can } = useAdminAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // ── Loading ──
  if (loading) {
    return (
      <div style={S.loadingScreen}>
        <div style={S.spinner} />
        <p style={{ color: '#64748b', marginTop: 12 }}>กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  // ── ไม่มี session → redirect login ──
  if (!session) {
    navigate('/login');
    return null;
  }

  // ── มี session แต่ไม่ใช่ admin ──
  if (!adminUser) {
    return (
      <div style={S.loadingScreen}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <h2 style={{ color: '#f1f5f9', marginTop: 16 }}>Access Denied</h2>
        <p style={{ color: '#64748b' }}>บัญชีนี้ไม่มีสิทธิ์เข้า Admin Portal</p>
        <button onClick={() => navigate('/discover')} style={S.backBtn}>กลับไปหน้าหลัก</button>
      </div>
    );
  }

  // ── admin.is_active = false ──
  if (adminUser.is_active === false) {
    return (
      <div style={S.loadingScreen}>
        <div style={{ fontSize: 48 }}>⏸️</div>
        <h2 style={{ color: '#f1f5f9', marginTop: 16 }}>Account Suspended</h2>
        <p style={{ color: '#64748b' }}>บัญชี Admin นี้ถูก suspend กรุณาติดต่อ Super Admin</p>
        <button onClick={handleSignOut} style={S.backBtn}>Sign Out</button>
      </div>
    );
  }

  const roleName = role?.name || 'admin';
  const roleColors = {
    super_admin:       '#e91e63',
    content_moderator: '#3b82f6',
    affiliate_manager: '#8b5cf6',
    finance_viewer:    '#10b981',
  };
  const roleColor = roleColors[roleName] || '#64748b';

  return (
    <div style={S.shell}>
      {/* ── SIDEBAR ── */}
      <aside style={S.sidebar}>
        {/* Logo */}
        <div style={S.logo}>
          <span style={{ fontSize: 22 }}>💞</span>
          <span style={S.logoText}>Thai Conexns</span>
        </div>
        <div style={{ fontSize: 10, color: '#475569', padding: '0 20px 16px', fontWeight: 600, letterSpacing: 1 }}>
          ADMIN PORTAL
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1 }}>
          {NAV_ITEMS.map(item => {
            // ซ่อน item ถ้าไม่มี permission (ยกเว้น Dashboard)
            if (item.module && !can(item.module, 'read')) return null;

            const isActive = location.pathname === item.path ||
              (item.path !== '/admin-secret-portal' && location.pathname.startsWith(item.path));

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{ ...S.navItem, ...(isActive ? S.navItemActive : {}) }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
                {isActive && <div style={S.navIndicator} />}
              </button>
            );
          })}
        </nav>

        {/* Admin Info */}
        <div style={S.adminInfo}>
          <div style={{ ...S.roleBadge, background: `${roleColor}22`, color: roleColor, border: `1px solid ${roleColor}44` }}>
            {roleName.replace('_', ' ').toUpperCase()}
          </div>
          <div style={S.adminName}>{adminUser.display_name}</div>
          <div style={S.adminEmail}>{adminUser.email}</div>
          <button onClick={handleSignOut} style={S.signOutBtn}>Sign Out</button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={S.main}>
        {/* Top Header */}
        <div style={S.header}>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>
            {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ ...S.roleBadge, background: `${roleColor}22`, color: roleColor, border: `1px solid ${roleColor}44` }}>
              {roleName.replace('_', ' ')}
            </span>
            <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{adminUser.display_name}</span>
          </div>
        </div>

        {/* Page Content */}
        <div style={S.content}>
          {children}
        </div>
      </main>
    </div>
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
    display: 'flex', flexDirection: 'column',
    overflowY: 'auto',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '20px 20px 8px',
  },
  logoText: { color: '#f1f5f9', fontWeight: 800, fontSize: 15 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '10px 20px',
    background: 'none', border: 'none',
    color: '#475569', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', textAlign: 'left',
    borderRadius: 0, position: 'relative',
    transition: 'color 0.15s',
  },
  navItemActive: {
    color: '#f1f5f9',
    background: '#1e293b',
  },
  navIndicator: {
    position: 'absolute', right: 0, top: '50%',
    transform: 'translateY(-50%)',
    width: 3, height: 20,
    background: '#e91e63', borderRadius: '2px 0 0 2px',
  },
  adminInfo: {
    padding: 16, borderTop: '1px solid #1e293b',
  },
  adminName:  { color: '#f1f5f9', fontWeight: 700, fontSize: 13, marginTop: 8 },
  adminEmail: { color: '#475569', fontSize: 11, marginTop: 2 },
  roleBadge: {
    display: 'inline-block',
    padding: '3px 8px', borderRadius: 20,
    fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  signOutBtn: {
    marginTop: 10, width: '100%',
    background: 'none', border: '1px solid #1e293b',
    borderRadius: 8, padding: '6px 0',
    color: '#475569', fontSize: 12, cursor: 'pointer',
    fontWeight: 600,
  },
  main: {
    flex: 1, display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    height: 56, flexShrink: 0,
    background: '#0a0f1e',
    borderBottom: '1px solid #1e293b',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
  },
  content: {
    flex: 1, overflowY: 'auto',
    background: '#0f172a',
  },
  loadingScreen: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: '#0f172a',
    fontFamily: "'Segoe UI', sans-serif",
  },
  spinner: {
    width: 36, height: 36,
    border: '3px solid #1e293b',
    borderTop: '3px solid #e91e63',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  backBtn: {
    marginTop: 20, padding: '10px 24px',
    background: '#e91e63', border: 'none',
    borderRadius: 10, color: '#fff',
    fontWeight: 700, cursor: 'pointer',
    fontSize: 14,
  },
};