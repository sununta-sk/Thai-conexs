// src/components/AdminLayout.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAdminAuth } from '../hooks/useAdminAuth';

const NAV_ITEMS = [
  { icon: '📊', label: 'Dashboard',         path: '/admin-secret-portal',          module: null },
  { icon: '👥', label: 'Users',             path: '/admin/users',                  module: 'users' },
  { icon: '🖼️', label: 'Photo Queue',      path: '/admin/moderation/photos',      module: 'content' },
  { icon: '🚨', label: 'Reports',           path: '/admin/moderation/reports',     module: 'content' },
  { icon: '🎫', label: 'Tickets',           path: '/admin/moderation/tickets',     module: 'content' },
  { icon: '🤝', label: 'Affiliates',        path: '/admin/affiliates',             module: 'affiliates' },
  { icon: '💸', label: 'Payouts',           path: '/admin/payouts',                module: 'affiliates' },
  { icon: '💰', label: 'Revenue',           path: '/admin/revenue',                module: 'finance' },
  { icon: '📋', label: 'Subscriptions',     path: '/admin/subscriptions',          module: 'finance' },
  { icon: '🏷️', label: 'Plans',            path: '/admin/plans',                  module: 'finance' },
  { icon: '⚙️', label: 'Platform Settings', path: '/admin/platform/settings',     module: 'platform' },
  { icon: '📢', label: 'Announcements',     path: '/admin/platform/announcements', module: 'platform' },
  { icon: '🏆', label: 'Commission',        path: '/admin/commission-settings',    module: 'platform' },
  { icon: '👤', label: 'Team',              path: '/admin/team',                   module: 'platform' },
  { icon: '📜', label: 'Audit Log',         path: '/admin/audit-log',              module: 'platform' },
];

const NAV_GROUPS = [
  { label: null,         paths: ['/admin-secret-portal'] },
  { label: 'USERS',      paths: ['/admin/users'] },
  { label: 'MODERATION', paths: ['/admin/moderation/photos', '/admin/moderation/reports', '/admin/moderation/tickets'] },
  { label: 'AFFILIATES', paths: ['/admin/affiliates', '/admin/payouts'] },
  { label: 'FINANCE',    paths: ['/admin/revenue', '/admin/subscriptions', '/admin/plans'] },
  { label: 'PLATFORM',   paths: ['/admin/platform/settings', '/admin/platform/announcements', '/admin/commission-settings'] },
  { label: 'TEAM',       paths: ['/admin/team', '/admin/audit-log'] },
];

// ── รายการภาษาทั้งหมด ──
const LANGUAGES = [
  { code: 'th', flag: '🇹🇭', label: 'ภาษาไทย' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
  { code: 'pt', flag: '🇧🇷', label: 'Português' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
  { code: 'hi', flag: '🇮🇳', label: 'हिन्दी' },
  { code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
  { code: 'id', flag: '🇮🇩', label: 'Bahasa Indonesia' },
  { code: 'ms', flag: '🇲🇾', label: 'Bahasa Melayu' },
]

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, adminUser, role, loading, can } = useAdminAuth();

  // ── Language state ──
  const [lang, setLang]           = useState('th')
  const [showLangMenu, setShowLangMenu] = useState(false)

  // โหลดภาษาจาก profiles เมื่อ session พร้อม
  useEffect(() => {
    if (!session?.user?.id) return
    supabase
      .from('profiles')
      .select('preferred_lang')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.preferred_lang) setLang(data.preferred_lang)
      })
  }, [session?.user?.id])

  // เปลี่ยนภาษา + save to DB
  async function changeLang(code) {
    setLang(code)
    setShowLangMenu(false)
    if (session?.user?.id) {
      await supabase
        .from('profiles')
        .update({ preferred_lang: code })
        .eq('id', session.user.id)
    }
  }

  useEffect(() => {
    if (loading) return
    if (!session) navigate('/login')
  }, [loading, session, navigate])

  // ปิด dropdown เมื่อคลิกนอก
  useEffect(() => {
    if (!showLangMenu) return
    const close = () => setShowLangMenu(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [showLangMenu])

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={S.loadingScreen}>
        <div style={S.spinner} />
        <p style={{ color: '#64748b', marginTop: 12 }}>กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  if (!session) return null;

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

  if (adminUser.is_active === false) {
    return (
      <div style={S.loadingScreen}>
        <div style={{ fontSize: 48 }}>⏸️</div>
        <h2 style={{ color: '#f1f5f9', marginTop: 16 }}>Account Suspended</h2>
        <p style={{ color: '#64748b' }}>บัญชี Admin นี้ถูก suspend</p>
        <button onClick={handleSignOut} style={S.backBtn}>Sign Out</button>
      </div>
    );
  }

  const roleName   = role?.name || 'admin';
  const roleColors = { super_admin: '#e91e63', content_moderator: '#3b82f6', affiliate_manager: '#8b5cf6', finance_viewer: '#10b981' };
  const roleColor  = roleColors[roleName] || '#64748b';

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]

  const renderedNav = NAV_GROUPS.map(group => {
    const items        = NAV_ITEMS.filter(item => group.paths.includes(item.path))
    const visibleItems = items.filter(item => !item.module || can(item.module, 'read'))
    if (visibleItems.length === 0) return null
    return (
      <div key={group.label || 'main'}>
        {group.label && <div style={S.navGroupLabel}>{group.label}</div>}
        {visibleItems.map(item => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/admin-secret-portal' && location.pathname.startsWith(item.path))
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              style={{ ...S.navItem, ...(isActive ? S.navItemActive : {}) }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span>{item.label}</span>
              {isActive && <div style={S.navIndicator} />}
            </button>
          )
        })}
      </div>
    )
  })

  return (
    <div style={S.shell}>
      <aside style={S.sidebar}>
        <div style={S.logo}>
          <span style={{ fontSize: 22 }}>💞</span>
          <span style={S.logoText}>Thai Conexns</span>
        </div>
        <div style={{ fontSize: 10, color: '#475569', padding: '0 20px 12px', fontWeight: 600, letterSpacing: 1 }}>
          ADMIN PORTAL
        </div>
        <nav style={{ flex: 1, overflowY: 'auto' }}>{renderedNav}</nav>
        <div style={S.adminInfo}>
          <div style={{ ...S.roleBadge, background: `${roleColor}22`, color: roleColor, border: `1px solid ${roleColor}44` }}>
            {roleName.replace(/_/g, ' ').toUpperCase()}
          </div>
          <div style={S.adminName}>{adminUser.display_name}</div>
          <div style={S.adminEmail}>{adminUser.email}</div>
          <button onClick={handleSignOut} style={S.signOutBtn}>Sign Out</button>
        </div>
      </aside>

      <main style={S.main}>
        <div style={S.header}>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* ── View App ── */}
            <a href="/discover" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 700, background: '#10b98118', color: '#34d399', border: '1px solid #10b98140' }}
              onMouseEnter={e => e.currentTarget.style.background = '#10b98130'}
              onMouseLeave={e => e.currentTarget.style.background = '#10b98118'}>
              ↗ View App
            </a>

            {/* ── Role + Name ── */}
            <span style={{ ...S.roleBadge, background: `${roleColor}22`, color: roleColor, border: `1px solid ${roleColor}44` }}>
              {roleName.replace(/_/g, ' ')}
            </span>
            <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{adminUser.display_name}</span>
          </div>
        </div>
        <div style={S.content}>{children}</div>
      </main>
    </div>
  );
}

const S = {
  shell:         { display: 'flex', height: '100vh', overflow: 'hidden', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif" },
  sidebar:       { width: 220, flexShrink: 0, background: '#0a0f1e', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  logo:          { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px 8px' },
  logoText:      { color: '#f1f5f9', fontWeight: 800, fontSize: 15 },
  navGroupLabel: { padding: '12px 20px 4px', fontSize: 9, fontWeight: 700, color: '#334155', letterSpacing: 1.5 },
  navItem:       { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 20px', background: 'none', border: 'none', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', position: 'relative', transition: 'color 0.15s' },
  navItemActive: { color: '#f1f5f9', background: '#1e293b' },
  navIndicator:  { position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, background: '#e91e63', borderRadius: '2px 0 0 2px' },
  adminInfo:     { padding: 16, borderTop: '1px solid #1e293b' },
  adminName:     { color: '#f1f5f9', fontWeight: 700, fontSize: 13, marginTop: 8 },
  adminEmail:    { color: '#475569', fontSize: 11, marginTop: 2 },
  roleBadge:     { display: 'inline-block', padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  signOutBtn:    { marginTop: 10, width: '100%', background: 'none', border: '1px solid #1e293b', borderRadius: 8, padding: '6px 0', color: '#475569', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  main:          { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header:        { height: 56, flexShrink: 0, background: '#0a0f1e', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' },
  content:       { flex: 1, overflowY: 'auto', background: '#0f172a' },
  loadingScreen: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif" },
  spinner:       { width: 36, height: 36, border: '3px solid #1e293b', borderTop: '3px solid #e91e63', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  backBtn:       { marginTop: 20, padding: '10px 24px', background: '#e91e63', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 },

  // ── Language Switcher ──
  langBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
    padding: '5px 10px', cursor: 'pointer', gap: 6,
  },
  langDropdown: {
    position: 'absolute', top: '110%', right: 0,
    background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
    zIndex: 999, minWidth: 200, maxHeight: 360, overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: 4,
  },
  langOption: {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '8px 12px', background: 'none', border: 'none',
    color: '#94a3b8', cursor: 'pointer', borderRadius: 8, fontSize: 13,
  },
  langOptionActive: {
    background: '#e91e6311', color: '#f1f5f9',
  },
};