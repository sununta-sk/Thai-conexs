// src/components/Navbar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useOnline } from '../contexts/OnlineContext';
import logoImg from '../lib/LotusConnexs.jpeg';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const { onlineCount } = useOnline();

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase
        .from('admin_users')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .eq('is_active', true)
        .maybeSingle();
      setIsAdmin(!!data);
    });
  }, []);

  const goTo = async (path) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/login'); return; }
    navigate(path);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      width: '100%',
      background: '#ffffff',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 16px',
      borderBottom: '1px solid #eeeeee',
      zIndex: 1000,
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      boxSizing: 'border-box',
    }}>

      {/* Left: Logo + Online pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src={logoImg}
          alt="Thai Conexns"
          style={{ height: 36, width: 36, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
          onClick={() => goTo('/discover')}
        />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: '#e8f5e9', borderRadius: 12, padding: '4px 10px',
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4caf50' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#4caf50' }}>{onlineCount} online</span>
        </div>
      </div>

      {/* Right: Nav buttons + NotificationBell */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={() => goTo('/discover')} style={navBtnStyle(isActive('/discover'))}>
          <span style={{ display: 'block', fontSize: '22px' }}>🔍</span>
          <span style={{ fontSize: '10px' }}>Discover</span>
        </button>

        <button onClick={() => goTo('/messages')} style={navBtnStyle(isActive('/messages'))}>
          <span style={{ display: 'block', fontSize: '22px' }}>💬</span>
          <span style={{ fontSize: '10px' }}>Messages</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => location.pathname.startsWith('/admin') ? navigate('/discover') : goTo('/admin-secret-portal')}
            style={{ ...navBtnStyle(location.pathname.startsWith('/admin')), color: location.pathname.startsWith('/admin') ? '#2ecc71' : '#f39c12' }}>
            <span style={{ display: 'block', fontSize: '22px' }}>⚡</span>
            <span style={{ fontSize: '10px' }}>Admin</span>
          </button>
        )}

        <button onClick={() => goTo('/profile-setup')} style={navBtnStyle(isActive('/profile-setup'))}>
          <span style={{ display: 'block', fontSize: '22px' }}>👤</span>
          <span style={{ fontSize: '10px' }}>Profile</span>
        </button>

        <div style={{ marginLeft: 4 }}>
          <NotificationBell />
        </div>
      </div>

    </div>
  );
}

const navBtnStyle = (active) => ({
  background: 'none',
  border: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: active ? '#e91e63' : '#cccccc',
  cursor: 'pointer',
  transition: '0.2s',
  padding: '4px 12px',
});