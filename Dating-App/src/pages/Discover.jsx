import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

// ฟังก์ชันสำหรับสร้าง Chat ID ที่เรียงลำดับ ID เพื่อให้ทั้งสองฝั่งเข้าห้องเดียวกัน
function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

export default function Discover() {
  const [profiles, setProfiles] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ── 1. ดึงข้อมูล User และ Profiles (ซ่อมให้ซ่อนตัวเองชัวร์ๆ) ────────────────
  useEffect(() => {
    async function fetchProfiles() {
      // ใช้ getSession แทน getUser เพื่อความนิ่งของข้อมูล Auth
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) { 
        navigate('/login'); 
        return; 
      }
      
      setCurrentUserId(user.id);

      // ดึงทุกคนในฐานข้อมูล ยกเว้นตัวเราเอง (.neq)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id);

      if (!error && data) {
        setProfiles(data);
      }
      setLoading(false);
    }
    fetchProfiles();
  }, [navigate]);

  // ── 2. ระบบ Presence เช็คคนออนไลน์ ───────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase.channel('discover-presence', {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUsers(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(channel); }; 
  }, [currentUserId]);

  const handleStartChat = (targetUserId) => {
    const chatId = getChatId(currentUserId, targetUserId);
    // เปลี่ยนไปหน้าห้องแชท (ใช้ Path ตามที่พี่ตั้งไว้)
    navigate(`/room-demo/${chatId}`);
  };

  const getMainPhoto = (profile) => {
    const raw = profile.avatar_url;
    if (!raw) return { url: 'https://placehold.co/150x150?text=No+Photo', cropX: 50, cropY: 50 };
    if (typeof raw === 'string') return { url: raw, cropX: 50, cropY: 50 };
    return { url: raw.url, cropX: raw.cropX ?? 50, cropY: raw.cropY ?? 50 };
  };

  return (
    <div style={S.page}>
      {/* Header จิ๋วแบบ ThaiFriendly */}
      <div style={S.header}>
        <span style={S.headerTitle}>Online Users</span>
        <div style={S.onlinePill}>
          <div style={S.onlineDot} />
          <span style={S.onlineCount}>{onlineUsers.size}</span>
        </div>
      </div>

      {loading ? (
        <div style={S.emptyState}>Loading...</div>
      ) : profiles.length === 0 ? (
        <div style={S.emptyState}>ไม่พบผู้ใช้คนอื่นในระบบ</div>
      ) : (
        <div style={S.grid}>
          {profiles.map((profile) => {
            const { url, cropX, cropY } = getMainPhoto(profile);
            const isOnline = onlineUsers.has(profile.id);
            const age = profile.details?.age ?? '';
            const city = profile.details?.city ?? '';

            return (
              <div key={profile.id} onClick={() => handleStartChat(profile.id)} style={S.card}>
                <div style={S.photoWrap}>
                  <img
                    src={url}
                    alt={profile.username}
                    style={{ ...S.photo, objectPosition: `${cropX}% ${cropY}%` }}
                  />
                  {/* จุดเขียวออนไลน์มุมรูป */}
                  {isOnline && (
                    <div style={S.onlineBadge}><div style={S.onlineBadgeDot} /></div>
                  )}
                </div>
                <div style={S.info}>
                  <div style={S.name}>● {profile.username}</div>
                  <div style={S.meta}>{age} {city}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Styles ขนาด "จิ๋วพิเศษ" เลียนแบบ ThaiFriendly ──────────────────────────
const S = {
  page: { background: '#f0f2f5', minHeight: '100vh', paddingBottom: 80 },
  header: {
    padding: '10px 15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fff',
    borderBottom: '1px solid #ddd',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  headerTitle: { fontSize: 14, fontWeight: 800, color: '#4a4a4a' },
  onlinePill: { display: 'flex', alignItems: 'center', gap: 4, background: '#e8f5e9', borderRadius: 12, padding: '4px 10px' },
  onlineDot: { width: 7, height: 7, borderRadius: '50%', background: '#4caf50' },
  onlineCount: { fontSize: 12, fontWeight: 700, color: '#4caf50' },
  
  // Grid จิ๋ว 4-5 รูปต่อแถว
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', 
    gap: '2px',
    padding: '2px',
  },
  card: { background: '#fff', cursor: 'pointer', position: 'relative', border: '0.5px solid #eee' },
  photoWrap: { position: 'relative', width: '100%', aspectRatio: '1/1', background: '#eee', overflow: 'hidden' },
  photo: { width: '100%', height: '100%', objectFit: 'cover' },
  
  onlineBadge: { position: 'absolute', top: 3, left: 3, background: '#fff', borderRadius: '50%', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  onlineBadgeDot: { width: 8, height: 8, borderRadius: '50%', background: '#4cd964' },
  
  info: { padding: '4px 2px', textAlign: 'center' },
  name: { fontWeight: 700, fontSize: '11px', color: '#007bff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  meta: { fontSize: '10px', color: '#777' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#999', fontSize: 14 },
};