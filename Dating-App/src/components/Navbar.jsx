// src/components/Navbar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useOnline } from '../context/OnlineContext';
import logoImg from '../lib/LotusConnexs.jpeg';

export default function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [myAvatar, setMyAvatar] = useState(null);
  const [myUsername, setMyUsername] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { onlineCount } = useOnline();
  const menuRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;

      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .eq('is_active', true)
        .maybeSingle();
      setIsAdmin(!!adminData);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('avatar_url, username')
        .eq('id', session.user.id)
        .maybeSingle();
      if (profileData) {
        const raw = profileData.avatar_url;
        const url = typeof raw === 'string' ? raw : raw?.url;
        setMyAvatar(url || null);
        setMyUsername(profileData.username || '');
      }
    });
  }, []);

  useEffect(() => {
    if (!showProfileMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProfileMenu]);

  const goTo = async (path) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/login'); return; }
    navigate(path);
    setShowProfileMenu(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowProfileMenu(false);
    navigate('/login');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      width: '100%',
      background: '#1e293b',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '10px 20px',
      borderBottom: '1px solid #334155',
      zIndex: 1000,
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      boxSizing: 'border-box',
    }}>

      {/* Left: Logo + Online pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifySelf: 'start' }}>
        <img
          src={logoImg}
          alt="Thai Conexns"
          style={{ height: 56, width: 56, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', boxShadow: '0 2px 6px rgba(233,30,99,0.3)' }}
          onClick={() => goTo('/discover')}
        />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(76, 175, 80, 0.15)', border: '1px solid rgba(76, 175, 80, 0.3)', borderRadius: 14, padding: '6px 12px',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf50' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#4caf50' }}>{onlineCount} online</span>
        </div>
      </div>

      {/* Center: Discover | Messages | Admin | Avatar dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 80, justifySelf: 'center' }}>
        <button onClick={() => goTo('/discover')} style={navBtnStyle(isActive('/discover'))}>
          <span style={{ display: 'block', fontSize: '24px' }}>🔍</span>
          <span style={{ fontSize: '11px' }}>Discover</span>
        </button>

        <button onClick={() => goTo('/messages')} style={navBtnStyle(isActive('/messages'))}>
          <span style={{ display: 'block', fontSize: '24px' }}>💬</span>
          <span style={{ fontSize: '11px' }}>Messages</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => location.pathname.startsWith('/admin') ? navigate('/discover') : goTo('/admin-secret-portal')}
            style={{ ...navBtnStyle(location.pathname.startsWith('/admin')), color: location.pathname.startsWith('/admin') ? '#2ecc71' : '#f39c12' }}>
            <span style={{ display: 'block', fontSize: '24px' }}>⚡</span>
            <span style={{ fontSize: '11px' }}>Admin</span>
          </button>
        )}

        {/* Avatar dropdown */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            onClick={() => setShowProfileMenu(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 30,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            {myAvatar ? (
              <img src={myAvatar} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid #334155' }} />
            ) : (
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div>
            )}
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>▼</span>
          </button>

          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              background: '#1e293b',
              borderRadius: 12,
              boxShadow: '0 6px 28px rgba(0,0,0,0.5)',
              minWidth: 200,
              overflow: 'hidden',
              zIndex: 100,
              border: '1px solid #334155',
            }}>
              {myUsername && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', background: '#0f172a' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9' }}>{myUsername}</div>
                </div>
              )}
              <MenuItem onClick={() => goTo('/profile-setup')}>✏️ Edit Profile</MenuItem>
              <MenuItem onClick={() => goTo('/profile-setup')}>🖼️ My Pictures</MenuItem>
              <MenuItem onClick={() => goTo('/account-settings')}>⚙️ Account Settings</MenuItem>
              <MenuItem onClick={() => goTo('/subscription')}>⭐ Upgrade</MenuItem>
              <MenuItem onClick={() => goTo('/notifications')}>🔔 Notifications</MenuItem>
              <div style={{ borderTop: '1px solid #334155' }} />
              <MenuItem onClick={handleLogout} color="#e91e63">🚪 Logout</MenuItem>
            </div>
          )}
        </div>
      </div>

      {/* Right: NotificationBell */}
      <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center' }}>
      </div>

    </div>
  );
}

function MenuItem({ children, onClick, color = '#94a3b8' }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        padding: '12px 16px',
        border: 'none',
        background: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 600,
        color: color,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
    >
      {children}
    </button>
  );
}

const navBtnStyle = (active) => ({
  background: 'none',
  border: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: active ? '#e91e63' : '#94a3b8',
  cursor: 'pointer',
  transition: '0.2s',
  padding: '4px 14px',
  fontWeight: 600,
});