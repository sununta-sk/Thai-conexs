// src/components/Navbar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useOnline } from '../context/OnlineContext';
import logoImg from '../lib/LotusConnexs.jpeg';
import { useTranslation } from '../hooks/useTranslation';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return isMobile;
}

export default function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [myUserId, setMyUserId] = useState(null);

  useEffect(() => {
    let channel;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;
      setMyUserId(uid);
      const lastSeen = localStorage.getItem('last_msg_seen_' + uid) || '1970-01-01';
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .neq('sender_id', uid)
        .gt('created_at', lastSeen)
        .or('chat_id.ilike.%' + uid + '%,room_id.ilike.%' + uid + '%');
      setUnreadMsgs(count || 0);
      channel = supabase.channel('navbar-msg-count')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const m = payload.new;
          if (m.sender_id === uid) return;
          const rid = m.chat_id || m.room_id || '';
          if (rid.includes(uid)) setUnreadMsgs(prev => prev + 1);
        })
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);
  const { lang, setLang } = useTranslation(['common']);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [myAvatar, setMyAvatar] = useState(null);
  const [myUsername, setMyUsername] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { onlineCount } = useOnline();
  const menuRef = useRef(null);
  const isMobile = useIsMobile();

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: adminData } = await supabase
        .from('admin_users').select('id')
        .eq('auth_user_id', session.user.id).eq('is_active', true).maybeSingle();
      setIsAdmin(!!adminData);
      const { data: profileData } = await supabase
        .from('profiles').select('avatar_url, username, subscription_plan')
        .eq('id', session.user.id).maybeSingle();
      if (profileData) {
        const raw = profileData.avatar_url;
        const url = typeof raw === 'string' ? raw : raw?.url;
        setMyAvatar(url || null);
        setMyUsername(profileData.username || '');
        setIsPremium(profileData.subscription_plan === 'gold' || profileData.subscription_plan === 'platinum');
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

  // ── MOBILE NAVBAR ─────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 1000,
        background: '#1e293b', borderBottom: '1px solid #334155',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)', boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', gap: 8,
      }}>
        {/* Logo small */}
        <img src={logoImg} alt="logo"
          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => goTo('/discover')} />

        {/* Online pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)', borderRadius: 12, padding: '4px 8px', flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4caf50' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4caf50' }}>{onlineCount}</span>
        </div>

        {/* Nav buttons */}
        <button onClick={() => goTo('/discover')} style={mobileNavBtn(isActive('/discover'))}>
          <span style={{ fontSize: 18 }}>🔍</span>
          <span style={{ fontSize: 9 }}>Discover</span>
        </button>

        <button onClick={() => goTo('/messages')} style={mobileNavBtn(isActive('/messages'))}>
          <span style={{ fontSize: 18 }}>💬</span>
          <span style={{ fontSize: 9 }}>Messages</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => location.pathname.startsWith('/admin') ? navigate('/discover') : goTo('/admin-secret-portal')}
            style={{ ...mobileNavBtn(location.pathname.startsWith('/admin')), color: location.pathname.startsWith('/admin') ? '#2ecc71' : '#f39c12' }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <span style={{ fontSize: 9 }}>Admin</span>
          </button>
        )}

        {/* Upgrade — icon only on mobile */}
        {!isPremium && (
          <button onClick={() => goTo('/subscription')} style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', color: '#fff', fontSize: 9, fontWeight: 800, flexShrink: 0, lineHeight: 1.3, textAlign: 'center' }}>
            ⭐{'\n'}Upgrade
          </button>
        )}

        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }} ref={menuRef}>
          <button onClick={() => setShowProfileMenu(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            {myAvatar
              ? <img src={myAvatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid #334155' }} />
              : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
            }
          </button>

          {showProfileMenu && (
            <div style={{ position: 'absolute', top: '110%', right: 0, background: '#1e293b', borderRadius: 12, boxShadow: '0 6px 28px rgba(0,0,0,0.5)', minWidth: 180, overflow: 'hidden', zIndex: 100, border: '1px solid #334155' }}>
              {myUsername && (
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #334155', background: '#0f172a' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9' }}>{myUsername}</div>
                </div>
              )}
              <MenuItem onClick={() => goTo('/profile-setup')}>✏️ Edit Profile</MenuItem>
              <MenuItem onClick={() => goTo('/account-settings')}>⚙️ Settings</MenuItem>
              <MenuItem onClick={() => goTo('/help')}>❓ Help</MenuItem>
              <MenuItem onClick={() => goTo('/notifications')}>🔔 Notifications</MenuItem>
              <div style={{ borderTop: '1px solid #334155' }} />
              <MenuItem onClick={handleLogout} color="#e91e63">🚪 Logout</MenuItem>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── DESKTOP NAVBAR (เหมือนเดิม) ──────────────────────────
  return (
    <div style={{
      position: 'fixed', top: 0, width: '100%',
      background: '#1e293b',
      display: 'grid', gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center', padding: '10px 20px',
      borderBottom: '1px solid #334155', zIndex: 1000,
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)', boxSizing: 'border-box',
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifySelf: 'start' }}>
        <img src={logoImg} alt="Thai Conexns"
          style={{ height: 56, width: 56, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', boxShadow: '0 2px 6px rgba(233,30,99,0.3)' }}
          onClick={() => goTo('/discover')} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)', borderRadius: 14, padding: '6px 12px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf50' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#4caf50' }}>{onlineCount} online</span>
        </div>
      </div>

      {/* Center */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 80, justifySelf: 'center' }}>
        <button onClick={() => goTo('/discover')} style={navBtnStyle(isActive('/discover'))}>
          <span style={{ display: 'block', fontSize: '24px' }}>🔍</span>
          <span style={{ fontSize: '11px' }}>Discover</span>
        </button>
        <button onClick={() => { if (myUserId) localStorage.setItem('last_msg_seen_' + myUserId, new Date().toISOString()); setUnreadMsgs(0); goTo('/messages'); }} style={{ ...navBtnStyle(isActive('/messages')), position: 'relative' }}>
          <span style={{ display: 'block', fontSize: '24px' }}>💬</span>
          <span style={{ fontSize: '11px' }}>Messages</span>
          {unreadMsgs > 0 && (
            <span style={{ position: 'absolute', top: -2, right: -8, background: '#e91e63', color: '#fff', borderRadius: '50%', minWidth: 20, height: 20, padding: '0 6px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {unreadMsgs > 9 ? '9+' : unreadMsgs}
            </span>
          )}
        </button>
        {isAdmin && (
          <button
            onClick={() => location.pathname.startsWith('/admin') ? navigate('/discover') : goTo('/admin-secret-portal')}
            style={{ ...navBtnStyle(location.pathname.startsWith('/admin')), color: location.pathname.startsWith('/admin') ? '#2ecc71' : '#f39c12' }}>
            <span style={{ display: 'block', fontSize: '24px' }}>⚡</span>
            <span style={{ fontSize: '11px' }}>Admin</span>
          </button>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }} ref={menuRef}>
          <div style={{ display: 'flex', gap: 0, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, overflow: 'hidden', marginRight: 4 }}>
            <button onClick={() => setLang('en')} style={{ padding: '6px 10px', background: lang === 'en' ? '#e91e63' : 'transparent', border: 'none', cursor: 'pointer', color: lang === 'en' ? '#fff' : '#94a3b8', fontSize: 12, fontWeight: 700 }}>EN</button>
            <button onClick={() => setLang('th')} style={{ padding: '6px 10px', background: lang === 'th' ? '#e91e63' : 'transparent', border: 'none', cursor: 'pointer', color: lang === 'th' ? '#fff' : '#94a3b8', fontSize: 12, fontWeight: 700 }}>TH</button>
          </div>
          {!isPremium && (
            <button onClick={() => goTo('/subscription')} style={{ padding: '8px 14px', borderRadius: 6, background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 800, boxShadow: '0 2px 6px rgba(34,197,94,0.3)', whiteSpace: 'nowrap' }}>
              Upgrade Account
            </button>
          )}
          <button onClick={() => setShowProfileMenu(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 30 }}
            onMouseEnter={e => e.currentTarget.style.background = '#334155'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            {myAvatar
              ? <img src={myAvatar} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid #334155' }} />
              : <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div>
            }
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>▼</span>
          </button>

          {showProfileMenu && (
            <div style={{ position: 'absolute', top: '110%', right: 0, background: '#1e293b', borderRadius: 12, boxShadow: '0 6px 28px rgba(0,0,0,0.5)', minWidth: 200, overflow: 'hidden', zIndex: 100, border: '1px solid #334155' }}>
              {myUsername && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', background: '#0f172a' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9' }}>{myUsername}</div>
                </div>
              )}
              <MenuItem onClick={() => goTo('/profile-setup')}>✏️ Edit Profile</MenuItem>
              <MenuItem onClick={() => goTo('/account-settings')}>⚙️ Account Settings</MenuItem>
              <MenuItem onClick={() => goTo('/help')}>❓ Help</MenuItem>
              <MenuItem onClick={() => goTo('/notifications')}>🔔 Notifications</MenuItem>
              <div style={{ borderTop: '1px solid #334155' }} />
              <MenuItem onClick={handleLogout} color="#e91e63">🚪 Logout</MenuItem>
            </div>
          )}
        </div>
      </div>

      {/* Right */}
      <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center' }} />
    </div>
  );
}

function MenuItem({ children, onClick, color = '#94a3b8' }) {
  return (
    <button onClick={onClick}
      style={{ display: 'block', width: '100%', padding: '12px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 14, fontWeight: 600, color }}
      onMouseEnter={e => e.currentTarget.style.background = '#334155'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
      {children}
    </button>
  );
}

const navBtnStyle = (active) => ({
  background: 'none', border: 'none', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  color: active ? '#e91e63' : '#94a3b8', cursor: 'pointer',
  padding: '4px 14px', fontWeight: 600,
});

const mobileNavBtn = (active) => ({
  background: 'none', border: 'none', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: 1,
  color: active ? '#e91e63' : '#94a3b8', cursor: 'pointer',
  padding: '2px 6px', fontWeight: 600, flexShrink: 0,
});
