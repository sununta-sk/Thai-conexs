import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';

function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

function BanScreen({ bannedUntil, banReason }) {
  const isPermanent = !bannedUntil;
  const until = bannedUntil ? new Date(bannedUntil) : null;
  const now   = new Date();
  const diffMs   = until ? until - now : null;
  const diffDays = diffMs ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : null;
  const diffHrs  = diffMs ? Math.ceil(diffMs / (1000 * 60 * 60)) : null;
  let timeLabel = '';
  if (isPermanent) timeLabel = 'ถาวร (Permanent)';
  else if (diffHrs <= 24) timeLabel = `อีกประมาณ ${diffHrs} ชั่วโมง`;
  else timeLabel = `อีกประมาณ ${diffDays} วัน`;
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#1e293b', border: '1px solid #ef444433', borderRadius: '20px', padding: '40px 32px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🚫</div>
        <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#f87171' }}>บัญชีของคุณถูกระงับ</h2>
        <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#64748b' }}>Your account has been suspended</p>
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '16px', marginBottom: '12px', textAlign: 'left' }}>
          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>เหตุผล</div>
          <div style={{ fontSize: '15px', color: '#f1f5f9' }}>{banReason || 'ละเมิดข้อกำหนดการใช้งาน'}</div>
        </div>
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>ระยะเวลา</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: isPermanent ? '#f87171' : '#fbbf24' }}>{timeLabel}</div>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); }} style={{ width: '100%', padding: '13px', borderRadius: '30px', border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Right Now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Discover() {
  const [profiles, setProfiles]           = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [onlineUsers, setOnlineUsers]     = useState(new Set());
  const [loading, setLoading]             = useState(true);
  const [banInfo, setBanInfo]             = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUserId) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
        const data = await res.json();
        const city = data.address?.city || data.address?.state_district || data.address?.state || '';
        if (city) await supabase.from('profiles').update({ city, last_seen_at: new Date().toISOString() }).eq('id', currentUserId);
      } catch {}
    }, () => {
      supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', currentUserId);
    });
  }, [currentUserId]);

  useEffect(() => {
    async function fetchProfiles() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { navigate('/login'); return; }
      setCurrentUserId(user.id);
      const { data: profile } = await supabase.from('profiles').select('banned_until, ban_reason').eq('id', user.id).maybeSingle();
      if (profile) {
        const isBanned = profile.banned_until === null && profile.ban_reason ? true
          : profile.banned_until && new Date(profile.banned_until) > new Date();
        if (isBanned) { setBanInfo({ bannedUntil: profile.banned_until, banReason: profile.ban_reason }); setLoading(false); return; }
      }
      const { data, error } = await supabase.from('profiles')
        .select('id, username, avatar_url, details, city, last_seen_at, is_verified')
        .neq('id', user.id);
      if (!error && data) setProfiles(data);
      setLoading(false);
    }
    fetchProfiles();
  }, [navigate]);

  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase.channel('discover-presence', { config: { presence: { key: currentUserId } } });
    channel
      .on('presence', { event: 'sync' }, () => setOnlineUsers(new Set(Object.keys(channel.presenceState()))))
      .subscribe(async (status) => { if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() }); });
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  const handleStartChat = (targetUserId) => navigate(`/room-chat/${getChatId(currentUserId, targetUserId)}`);

  const getMainPhoto = (profile) => {
    const raw = profile.avatar_url;
    if (!raw) return 'https://placehold.co/150x150?text=No+Photo';
    if (typeof raw === 'string') return raw;
    return raw.url;
  };

  if (!loading && banInfo) return <BanScreen bannedUntil={banInfo.bannedUntil} banReason={banInfo.banReason} />;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={S.headerTitle}>Thai Conexns</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={S.onlinePill}>
            <div style={S.onlineDot} />
            <span style={S.onlineCount}>{onlineUsers.size} online</span>
          </div>
          <NotificationBell />
        </div>
      </div>

      {loading ? (
        <div style={S.emptyState}>Loading...</div>
      ) : profiles.length === 0 ? (
        <div style={S.emptyState}>ไม่พบผู้ใช้คนอื่นในระบบ</div>
      ) : (
        <div style={S.grid}>
          {profiles.map((profile) => {
            const photoUrl  = getMainPhoto(profile);
            const isOnline  = onlineUsers.has(profile.id);
            const age       = profile.details?.age    ?? '';
            const gender    = profile.details?.gender ?? '';
            const city      = profile.city || profile.details?.city || '';
            const lastSeen  = isOnline ? 'Right Now' : timeAgo(profile.last_seen_at);
            const metaParts = [age, gender ? gender[0].toUpperCase() : '', city].filter(Boolean);

            return (
              <div key={profile.id} style={S.card}>
                {/* Photo — คลิกเพื่อดูโปรไฟล์ (เปลี่ยนจาก handleStartChat → navigate profile) */}
                <div style={S.photoWrap} onClick={() => navigate(`/profile/${profile.id}`)}>
                  <img src={photoUrl} alt={profile.username} style={S.photo} />
                  {profile.is_verified && <div style={S.verifiedBadge}>✓</div>}
                  <div style={{ ...S.onlineBadge, background: isOnline ? '#4cd964' : '#bbb' }} />
                </div>

                {/* Info */}
                <div style={S.info}>
                  <div style={S.name}>{profile.username || '—'}</div>
                  {metaParts.length > 0 && <div style={S.meta}>{metaParts.join(', ')}</div>}
                  <div style={{ ...S.lastSeen, color: isOnline ? '#4caf50' : '#999' }}>{lastSeen}</div>
                </div>

                {/* Action buttons — ✕ และ 💬 คงเดิม */}
                <div style={S.actions}>
                  <button style={S.btnX} onClick={e => e.stopPropagation()}>✕</button>
                  <button style={S.btnChat} onClick={e => { e.stopPropagation(); handleStartChat(profile.id); }}>💬</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const S = {
  page: { background: '#f5f5f5', minHeight: '100vh', paddingBottom: 80 },
  header: {
    padding: '10px 15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fff',
    borderBottom: '1px solid #e0e0e0',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: 800, color: '#e91e63' },
  onlinePill: { display: 'flex', alignItems: 'center', gap: 5, background: '#e8f5e9', borderRadius: 12, padding: '4px 10px' },
  onlineDot: { width: 7, height: 7, borderRadius: '50%', background: '#4caf50' },
  onlineCount: { fontSize: 12, fontWeight: 700, color: '#4caf50' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px',
    padding: '16px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  card: {
    background: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  photoWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1/1',
    background: '#eee',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  verifiedBadge: {
    position: 'absolute', top: 4, left: 4,
    width: 16, height: 16, borderRadius: '50%',
    background: '#3b82f6', color: '#fff',
    fontSize: 9, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  onlineBadge: {
    position: 'absolute', top: 4, right: 4,
    width: 9, height: 9, borderRadius: '50%',
    border: '2px solid #fff',
  },
  info: { padding: '6px 6px 4px' },
  name: {
    fontSize: '12px', fontWeight: 700, color: '#333',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  meta: {
    fontSize: '10px', color: '#777', marginTop: '1px',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  lastSeen: { fontSize: '9px', marginTop: '1px' },
  actions: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '4px',
    borderTop: '1px solid #f0f0f0',
  },
  btnX: {
    background: 'none', border: 'none',
    color: '#ccc', fontSize: '13px',
    cursor: 'pointer', padding: '3px 10px',
  },
  btnChat: {
    background: '#fce4ec', border: 'none',
    borderRadius: '12px', color: '#e91e63',
    fontSize: '13px', cursor: 'pointer',
    padding: '3px 10px',
  },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#999', fontSize: 14 },
};