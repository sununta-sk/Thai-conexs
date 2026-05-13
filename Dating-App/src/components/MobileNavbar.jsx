// src/components/MobileNavbar.jsx
// Mobile-optimized navbar: compact top + fixed bottom nav.
// Used by Navbar wrapper when useIsMobile() returns true.
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from '../hooks/useTranslation';
import { useOnline } from '../context/OnlineContext';
import logoImg from '../lib/LotusConnexs.jpeg';
import { useUnreadCount } from '../hooks/useUnreadCount';

const TOP_H = 56;
const BOTTOM_H = 64;

function MenuItem({ onClick, color = '#f1f5f9', children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', padding: '12px 16px',
        background: 'none', border: 'none', textAlign: 'left',
        cursor: 'pointer', color, fontSize: 13, fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = '#0f172a'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
      {children}
    </button>
  );
}

export default function MobileNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tx } = useTranslation(['common', 'discover', 'messages']);
  const { onlineCount } = useOnline();
  const [isAdmin, setIsAdmin] = useState(false);
  const [myAvatar, setMyAvatar] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const unreadCount = useUnreadCount();

  // Body padding so content doesn't hide behind fixed bars
  useEffect(() => {
    const b = document.body.style;
    const origTop = b.paddingTop;
    const origBot = b.paddingBottom;
    b.paddingTop = `${TOP_H}px`;
    b.paddingBottom = `${BOTTOM_H}px`;
    return () => {
      b.paddingTop = origTop;
      b.paddingBottom = origBot;
    };
  }, []);

  // Fetch admin + avatar (mirror Navbar.jsx logic)
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session || cancelled) return;
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (cancelled) return;
      setIsAdmin(!!adminData);
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, photos')
        .eq('id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      setMyAvatar(profile?.avatar_url || profile?.photos?.[0] || null);
    });
    return () => { cancelled = true; };
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const goTo = (path) => { setShowMenu(false); navigate(path); };
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const adminActive = location.pathname.startsWith('/admin');

  const handleLogout = async () => {
    setShowMenu(false);
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navBtn = (active) => ({
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 2, padding: '6px 0',
    background: 'none', border: 'none', cursor: 'pointer',
    color: active ? '#e91e63' : '#94a3b8',
    fontSize: 10, fontWeight: 700,
  });

  return (
    <>
      {/* Top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: TOP_H, background: '#0f172a',
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8,
        borderBottom: '1px solid #334155', zIndex: 1000,
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      }}>
        <img
          src={logoImg} alt="Thai Conexns"
          onClick={() => goTo('/discover')}
          style={{
            width: 38, height: 38, borderRadius: '50%',
            objectFit: 'cover', cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(233,30,99,0.3)',
          }}
        />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(76,175,80,0.15)',
          border: '1px solid rgba(76,175,80,0.3)',
          borderRadius: 12, padding: '4px 10px',
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4caf50' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4caf50' }}>
            {onlineCount} {tx.online || 'online'}
          </span>
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: BOTTOM_H, background: '#0f172a',
        borderTop: '1px solid #334155', zIndex: 1000,
        display: 'flex', alignItems: 'stretch',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.3)',
      }}>
        <button onClick={() => goTo('/discover')} style={navBtn(isActive('/discover'))}>
          <span style={{ fontSize: 22 }}>🔍</span>
          <span>{tx.discoverNav || 'Discover'}</span>
        </button>
        <button onClick={() => goTo('/messages')} style={navBtn(isActive('/messages'))}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
            <span style={{ fontSize: 22 }}>💬</span>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -8,
                minWidth: 16, height: 16, padding: '0 4px',
                borderRadius: 999, background: '#ef4444', color: '#fff',
                fontSize: 10, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.4)', border: '1.5px solid #0f172a',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span>{tx.messagesNav || 'Messages'}</span>
        </button>
        {isAdmin && (
          <button
            onClick={() => adminActive ? navigate('/discover') : goTo('/admin-secret-portal')}
            style={{ ...navBtn(adminActive), color: adminActive ? '#2ecc71' : '#f39c12' }}>
            <span style={{ fontSize: 22 }}>⚡</span>
            <span>{tx.admin || 'Admin'}</span>
          </button>
        )}
        <div ref={menuRef} style={{ flex: 1, position: 'relative', display: 'flex' }}>
          <button
            onClick={() => setShowMenu(v => !v)}
            style={{ ...navBtn(showMenu), width: '100%' }}>
            {myAvatar ? (
              <img
                src={myAvatar} alt=""
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  objectFit: 'cover',
                  border: showMenu ? '2px solid #e91e63' : '2px solid #334155',
                }}
              />
            ) : (
              <span style={{ fontSize: 22 }}>👤</span>
            )}
            <span>{tx.you || 'You'}</span>
          </button>
          {showMenu && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', right: 8,
              background: '#1e293b', borderRadius: 12, minWidth: 220,
              border: '1px solid #334155',
              boxShadow: '0 -6px 28px rgba(0,0,0,0.5)',
              overflow: 'hidden', zIndex: 1001,
            }}>
              <MenuItem onClick={() => goTo('/profile-setup')}>
                ✏️ {tx.editProfile || 'Edit Profile'}
              </MenuItem>
              <MenuItem onClick={() => goTo('/account-settings')}>
                ⚙️ {tx.accountSettings || 'Account Settings'}
              </MenuItem>
              <MenuItem onClick={() => goTo('/help')}>
                ❓ {tx.help || 'Help'}
              </MenuItem>
              <MenuItem onClick={() => goTo('/notifications')}>
                🔔 {tx.notifications || 'Notifications'}
              </MenuItem>
              <MenuItem onClick={() => goTo('/subscription')}>
                💎 {tx.upgradeAccount || 'Upgrade Account'}
              </MenuItem>
              <div style={{ borderTop: '1px solid #334155' }} />
              <MenuItem onClick={handleLogout} color="#e91e63">
                🚪 {tx.logout || 'Logout'}
              </MenuItem>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
