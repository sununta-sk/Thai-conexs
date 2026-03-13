import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
// ดึงรูปภาพจากในโฟลเดอร์ lib มาใช้โดยตรง
import logoImg from '../lib/LotusConnexs.jpeg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) navigate('/discover');
    else alert(error.message);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/discover' },
    });
    if (error) alert(error.message);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px', textAlign: 'center', background: '#fff' }}>
      
      {/* ส่วนแสดงโลโก้ที่ดึงมาจากไฟล์ในโปรเจกต์ */}
      <div style={{ marginBottom: '20px' }}>
        <img 
          src={logoImg} 
          alt="Lotus Connex Logo" 
          style={{ width: '280px', height: 'auto', objectFit: 'contain' }}
        />
      </div>

      <h1 style={{ color: '#e91e63', fontSize: '36px', margin: '0', fontWeight: 'bold' }}>ThaiConnect</h1>
      <p style={{ color: '#666', marginBottom: '30px', fontSize: '16px' }}>Find your perfect match today.</p>

      <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: '350px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          style={inputStyle} 
          required 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          style={inputStyle} 
          required 
        />
        
        <button type="submit" style={btnStyle}>Log In</button>
        
        <div style={{ display: 'flex', alignItems: 'center', margin: '15px 0' }}>
            <hr style={{ flex: 1, border: '0.5px solid #eee' }} />
            <span style={{ padding: '0 10px', color: '#999', fontSize: '12px' }}>OR</span>
            <hr style={{ flex: 1, border: '0.5px solid #eee' }} />
        </div>

        <button type="button" onClick={handleGoogleLogin} style={googleBtnStyle}>
          <img src="https://www.google.com/favicon.ico" width="20" alt="google" />
          Continue with Google
        </button>
      </form>

      <p style={{ marginTop: '30px' }}>
        Don't have an account? <Link to="/register" style={{ color: '#e91e63', fontWeight: 'bold', textDecoration: 'none' }}>Sign Up</Link>
      </p>
    </div>
  );
}

// แก้ไขแค่สีตัวอักษรตรงนี้ครับพี่
const inputStyle = { 
  padding: '15px', 
  borderRadius: '12px', 
  border: '1px solid #ddd', 
  fontSize: '16px', 
  background: '#fdfdfd', 
  color: '#333333', // เพิ่มตรงนี้เพื่อให้เห็นตัวอักษรเทาเข้มชัดเจน
  outline: 'none' 
};

const btnStyle = { padding: '16px', borderRadius: '30px', border: 'none', background: '#e91e63', color: '#fff', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' };
const googleBtnStyle = { padding: '15px', borderRadius: '30px', border: '1px solid #ddd', background: '#fff', color: '#444', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' };