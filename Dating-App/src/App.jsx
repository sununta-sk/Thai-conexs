import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';

import Login from './pages/Login';
import Register from './pages/Register';
import ProfileSetup from './pages/ProfileSetup';
import Discover from './pages/Discover';
import Messages from './pages/Messages';
import RoomChat from './pages/RoomChat';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';

// ตัวกั้นประตูสำหรับ User ปกติ
const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div style={{ background: '#fff', height: '100vh' }}></div>;
  if (!session) return <Navigate to="/login" replace />; 
  return children;
};

export default function App() {
  return (
    <Router>
      <div style={{ width: '100vw', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* หน้าสำหรับ User ทั่วไป */}
            <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
            {/* แก้จาก /room-demo/:chatId → /room-chat/:chatId ให้ตรงกับที่ Messages.jsx navigate ไป */}
            <Route path="/room-chat/:chatId" element={<ProtectedRoute><RoomChat /></ProtectedRoute>} />
            
            {/* หน้า Admin Portal */}
            <Route path="/admin-secret-portal" element={<AdminDashboard />} />
            
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
        <Navbar />
      </div>
    </Router>
  );
}
