import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 0, 
      width: '100%', 
      background: '#ffffff', 
      display: 'flex', 
      justifyContent: 'space-around', 
      padding: '12px 0',
      borderTop: '1px solid #eeeeee', 
      zIndex: 1000,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
    }}>
      {/* 1. ปุ่ม Discover */}
      <button 
        onClick={() => navigate('/discover')} 
        style={navBtnStyle(isActive('/discover'))}
      >
        <span style={{ display: 'block', fontSize: '24px' }}>🔍</span>
        <span style={{ fontSize: '10px' }}>Discover</span>
      </button>

      {/* 2. ปุ่ม Messages (Inbox) */}
      <button 
        onClick={() => navigate('/messages')} 
        style={navBtnStyle(isActive('/messages'))}
      >
        <span style={{ display: 'block', fontSize: '24px' }}>💬</span>
        <span style={{ fontSize: '10px' }}>Messages</span>
      </button>

      {/* --- 3. ปุ่มพิเศษสำหรับพี่ (วาร์ปไปหน้า Admin) --- */}
      <button 
        onClick={() => {
          // ถ้าอยู่หน้า Admin ให้วาร์ปกลับไป Discover
          // ถ้าอยู่หน้าอื่น ให้วาร์ปไป Admin
          if (location.pathname === '/admin-secret-portal') {
            navigate('/discover');
          } else {
            navigate('/admin-secret-portal');
          }
        }} 
        style={{
          ...navBtnStyle(isActive('/admin-secret-portal')),
          color: isActive('/admin-secret-portal') ? '#2ecc71' : '#f39c12' // สีส้ม/เขียวให้เด่น
        }}
      >
        <span style={{ display: 'block', fontSize: '24px' }}>⚡</span>
        <span style={{ fontSize: '10px' }}>Admin</span>
      </button>
      
      {/* 4. ปุ่ม Profile */}
      <button 
        onClick={() => navigate('/profile-setup')} 
        style={navBtnStyle(isActive('/profile-setup'))}
      >
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
  flex: 1
});