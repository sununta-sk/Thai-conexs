// src/components/Navbar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
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
    <div style={{ position: 'fixed', top: 0, width: '100%', background: '#ffffff', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eeeeee', zIndex: 1000, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <button onClick={() => goTo('/discover')} style={navBtnStyle(isActive('/discover'))}>
        <span style={{ display: 'block', fontSize: '24px' }}>🔍</span>
        <span style={{ fontSize: '10px' }}>Discover</span>
      </button>
      <button onClick={() => goTo('/messages')} style={navBtnStyle(isActive('/messages'))}>
        <span style={{ display: 'block', fontSize: '24px' }}>💬</span>
        <span style={{ fontSize: '10px' }}>Messages</span>
      </button>
      {isAdmin && (
        <button onClick={() => location.pathname.startsWith('/admin') ? navigate('/discover') : goTo('/admin/dashboard')}
          style={{ ...navBtnStyle(location.pathname.startsWith('/admin')), color: location.pathname.startsWith('/admin') ? '#2ecc71' : '#f39c12' }}>
          <span style={{ display: 'block', fontSize: '24px' }}>⚡</span>
          <span style={{ fontSize: '10px' }}>Admin</span>
        </button>
      )}
      <button onClick={() => goTo('/profile-setup')} style={navBtnStyle(isActive('/profile-setup'))}>
        <span style={{ display: 'block', fontSize: '24px' }}>👤</span>
        <span style={{ fontSize: '10px' }}>Profile</span>
      </button>
    </div>
  );
}

const navBtnStyle = (active) => ({
  background: 'none', border: 'none', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  color: active ? '#e91e63' : '#cccccc', cursor: 'pointer', transition: '0.2s', flex: 1,
});
