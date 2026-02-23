import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

// chatId ต้องเป็น sorted pair เสมอ ทั้ง Discover และ RoomChat ต้องใช้ฟังก์ชันนี้
function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

export default function Discover() {
  const [profiles, setProfiles] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ── 1. ดึง session + profiles ────────────────────────────────────────────────
  useEffect(() => {
    async function fetchProfiles() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id);

      if (!error && data) setProfiles(data);
      setLoading(false);
    }
    fetchProfiles();
  }, [navigate]);

  // ── 2. Presence — ดูว่าใครออนไลน์อยู่ ───────────────────────────────────────
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

    return () => { supabase.removeChannel(channel); }; // CRITICAL: cleanup
  }, [currentUserId]);

  // ── 3. Navigate ไปแชท ────────────────────────────────────────────────────────
  const handleStartChat = (targetUserId) => {
    const chatId = getChatId(currentUserId, targetUserId); // sorted pair เสมอ
    navigate(`/room-demo/${chatId}`);
  };

  // ── 4. ดึง URL รูปหลักพร้อม crop position ───────────────────────────────────
  const getMainPhoto = (profile) => {
    // avatar_url อาจเป็น string (เก่า) หรือ object ที่มี cropX/cropY (ใหม่)
    const raw = profile.avatar_url;
    if (!raw) return { url: 'https://placehold.co/300x400?text=No+Photo', cropX: 50, cropY: 50 };
    if (typeof raw === 'string') return { url: raw, cropX: 50, cropY: 50 };
    return { url: raw.url, cropX: raw.cropX ?? 50, cropY: raw.cropY ?? 50 };
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={S.header}>
        <h2 style={S.headerTitle}>ค้นหาเพื่อนใหม่</h2>
        <div style={S.onlinePill}>
          <div style={S.onlineDot} />
          <span style={S.onlineCount}>{onlineUsers.size} ออนไลน์</span>
        </div>
      </div>

      {loading ? (
        <div style={S.emptyState}>กำลังโหลด...</div>
      ) : profiles.length === 0 ? (
        <div style={S.emptyState}>ยังไม่มีผู้ใช้คนอื่น</div>
      ) : (
        <div style={S.grid}>
          {profiles.map((profile) => {
            const { url, cropX, cropY } = getMainPhoto(profile);
            const isOnline = onlineUsers.has(profile.id);
            const age = profile.details?.age ?? '';
            const city = profile.details?.city ?? '';

            return (
              <div
                key={profile.id}
                onClick={() => handleStartChat(profile.id)}
                style={S.card}
              >
                {/* Photo */}
                <div style={S.photoWrap}>
                  <img
                    src={url}
                    alt={profile.username}
                    style={{
                      ...S.photo,
                      objectPosition: `${cropX}% ${cropY}%`,
                    }}
                    onError={(e) => { e.target.src = 'https://placehold.co/300x400?text=No+Photo'; }}
                  />

                  {/* Online badge */}
                  {isOnline && (
                    <div style={S.onlineBadge}>
                      <div style={S.onlineBadgeDot} />
                      Online
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={S.info}>
                  <div style={S.name}>{profile.username || 'User'}</div>
                  <div style={S.meta}>
                    {[age && `${age}`, profile.details?.height, city]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  {profile.bio && (
                    <div style={S.bio} title={profile.bio}>
                      {profile.bio.length > 50 ? profile.bio.slice(0, 50) + '…' : profile.bio}
                    </div>
                  )}

                  {/* Chat button */}
                  <button style={S.chatBtn}>
                    💬 ส่งข้อความ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  page: {
    background: '#f4f6fb',
    minHeight: '100vh',
    paddingBottom: 100,
  },
  header: {
    padding: '18px 16px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fff',
    borderBottom: '1px solid #eee',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    color: '#1a1a2e',
  },
  onlinePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: '#fff3e0',
    borderRadius: 20,
    padding: '4px 10px',
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#ff9500',
  },
  onlineCount: {
    fontSize: 12,
    fontWeight: 700,
    color: '#ff9500',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
    padding: '14px 12px',
    maxWidth: 800,
    margin: '0 auto',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    cursor: 'pointer',
    border: '1px solid #f0f0f0',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  photoWrap: {
    position: 'relative',
    width: '100%',
    height: 200,
    background: '#eee',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  onlineBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    background: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    padding: '3px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
  },
  onlineBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#4cd964',
    flexShrink: 0,
  },
  info: {
    padding: '10px 12px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  name: {
    fontWeight: 800,
    fontSize: 15,
    color: '#1a1a2e',
  },
  meta: {
    fontSize: 12,
    color: '#888',
    fontWeight: 600,
  },
  bio: {
    fontSize: 12,
    color: '#aaa',
    lineHeight: 1.4,
    marginTop: 2,
  },
  chatBtn: {
    marginTop: 8,
    width: '100%',
    padding: '8px',
    borderRadius: 20,
    border: 'none',
    background: 'linear-gradient(135deg, #f97316, #ea580c)',
    color: '#fff',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#aaa',
    fontSize: 15,
  },
};