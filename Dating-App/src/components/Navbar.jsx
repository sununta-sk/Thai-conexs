// src/components/Navbar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const goTo = async (path) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/login'); return; }
    navigate(path);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      width: '100%',
      background: '#ffffff',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '12px 0',
      borderTop: '1px solid #eeeeee',
      zIndex: 1000,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
    }}>

      {/* 1. Discover */}
      <button onClick={() => goTo('/discover')} style={navBtnStyle(isActive('/discover'))}>
        <span style={{ display: 'block', fontSize: '24px' }}>🔍</span>
        <span style={{ fontSize: '10px' }}>Discover</span>
      </button>

      {/* 2. Messages */}
      <button onClick={() => goTo('/messages')} style={navBtnStyle(isActive('/messages'))}>
        <span style={{ display: 'block', fontSize: '24px' }}>💬</span>
        <span style={{ fontSize: '10px' }}>Messages</span>
      </button>

      {/* 3. Admin */}
      <button
        onClick={() => {
          if (location.pathname === '/admin-secret-portal') {
            navigate('/discover');
          } else {
            goTo('/admin-secret-portal');
          }
        }}
        style={{
          ...navBtnStyle(isActive('/admin-secret-portal')),
          color: isActive('/admin-secret-portal') ? '#2ecc71' : '#f39c12',
        }}
      >
        <span style={{ display: 'block', fontSize: '24px' }}>⚡</span>
        <span style={{ fontSize: '10px' }}>Admin</span>
      </button>

      {/* 4. Profile */}
      <button onClick={() => goTo('/profile-setup')} style={navBtnStyle(isActive('/profile-setup'))}>
        <span style={{ display: 'block', fontSize: '24px' }}>👤</span>
        <span style={{ fontSize: '10px' }}>Profile</span>
      </button>

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
  flex: 1,
});