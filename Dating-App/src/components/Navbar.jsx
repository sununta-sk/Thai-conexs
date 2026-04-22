// src/components/Navbar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useOnline } from '../context/OnlineContext';
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
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '10px 20px',
      borderBottom: '1px solid #eeeeee',
      zIndex: 1000,
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      boxSizing: 'border-box',
    }}>

      {/* Left: Logo + Online pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifySelf: 'start' }}>
        <img
          src={logoImg}
          alt="Thai Conexns"
          style={{ height: 56, width: 56, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
          onClick={() => goTo('/discover')}
        />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#e8f5e9', borderRadius: 14, padding: '6px 12px',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf50' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#4caf50' }}>{onlineCount} online</span>
        </div>
      </div>

      {/* Center: Nav buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifySelf: 'center' }}>
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

        <button onClick={() => goTo('/profile-setup')} style={navBtnStyle(isActive('/profile-setup'))}>
          <span style={{ display: 'block', fontSize: '24px' }}>👤</span>
          <span style={{ fontSize: '11px' }}>Profile</span>
        </button>
      </div>

      {/* Right: NotificationBell */}
      <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center' }}>
        <NotificationBell />
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
  color: active ? '#e91e63' : '#888',
  cursor: 'pointer',
  transition: '0.2s',
  padding: '4px 14px',
  fontWeight: 600,
});