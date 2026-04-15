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
  else timeLabel = `อีกประมาณ ${diffDays} วัน (ถึง ${until.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })})`;

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#1e293b', border: '1px solid #ef444433', borderRadius: '20px', padding: '40px 32px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🚫</div>
        <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#f87171' }}>บัญชีของคุณถูกระงับ</h2>
        <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#64748b' }}>Your account has been suspended</p>
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '16px', marginBottom: '12px', textAlign: 'left' }}>
          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>เหตุผล / Reason</div>
          <div style={{ fontSize: '15px', color: '#f1f5f9', fontWeight: 500 }}>{banReason || 'ละเมิดข้อกำหนดการใช้งาน'}</div>
        </div>
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>ระยะเวลา / Duration</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: isPermanent ? '#f87171' : '#fbbf24' }}>{timeLabel}</div>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); }} style={{ width: '100%', padding: '13px', borderRadius: '30px', border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          ออกจากระบบ / Sign Out
        </button>
      </div>
    </div>
  );
}

// แปลงเวลา last_seen เป็น "Right Now", "2 min ago" ฯลฯ
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Right Now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Discover() {
  const [profiles, setProfiles]       = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [loading, setLoading]         = useState(true);
  const [banInfo, setBanInfo]         = useState(null);
  const navigate = useNavigate();

  // ── GPS: ดึง city แล้ว save ลง profiles ──────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
        const data = await res.json();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state || '';
        if (city) {
          await supabase.from('profiles').update({ city, last_seen_at: new Date().toISOString() }).eq('id', currentUserId);
        }
      } catch {}
    }, () => {
      // permission denied — update last_seen only
      supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', currentUserId);
    });
  }, [currentUserId]);

  useEffect(() => {
    async function fetchProfiles() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { navigate('/login'); return; }
      setCurrentUserId(user.id);

      // check ban
      const { data: profile } = await supabase
        .from('profiles').select('banned_until, ban_reason').eq('id', user.id).maybeSingle();
      if (profile) {
        const isBanned = profile.banned_until === null && profile.ban_reason
          ? true
          : profile.banned_until && new Date(profile.banned_until) > new Date();
        if (isBanned) { setBanInfo({ bannedUntil: profile.banned_until, banReason: profile.ban_reason }); setLoading(false); return; }
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, details, city, last_seen_at, is_verified')
        .neq('id', user.id);
      if (!error && data) setProfiles(data);
      setLoading(false);
    }
    fetchProfiles();
  }, [navigate]);

  // ── Presence ───────────────────────────────────────────────────────────────
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
        if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() });
      });
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  const handleStartChat = (targetUserId) => {
    const chatId = getChatId(currentUserId, targetUserId);
    navigate(`/room-chat/${chatId}`);
  };

  const getMainPhoto = (profile) => {
    const raw = profile.avatar_url;
    if (!raw) return { url: 'https://placehold.co/300x300?text=No+Photo', cropX: 50, cropY: 50 };
    if (typeof raw === 'string') return { url: raw, cropX: 50, cropY: 50 };
    return { url: raw.url, cropX: raw.cropX ?? 50, cropY: raw.cropY ?? 50 };
  };

  if (!loading && banInfo) return <BanScreen bannedUntil={banInfo.bannedUntil} banReason={banInfo.banReason} />;

  return (
    <div style={S.page}>
      {/* Header */}
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
            const { url, cropX, cropY } = getMainPhoto(profile);
            const isOnline  = onlineUsers.has(profile.id);
            const age       = profile.details?.age    ?? '';
            const gender    = profile.details?.gender ?? '';
            const city      = profile.city || profile.details?.city || '';
            const lastSeen  = isOnline ? 'Right Now' : timeAgo(profile.last_seen_at);

            // สร้าง meta line: "28 · M · Bangkok"
            const metaParts = [age, gender ? gender[0] : '', city].filter(Boolean);
            const metaLine  = metaParts.join(' · ');

            return (
              <div key={profile.id} onClick={() => handleStartChat(profile.id)} style={S.card}>
                <div style={S.photoWrap}>
                  <img
                    src={url}
                    alt={profile.username}
                    style={{ ...S.photo, objectPosition: `${cropX}% ${cropY}%` }}
                  />
                  {/* gradient overlay */}
                  <div style={S.overlay} />

                  {/* verified badge */}
                  {profile.is_verified && (
                    <div style={S.verifiedBadge}>✓</div>
                  )}

                  {/* online dot */}
                  <div style={{ ...S.onlineBadge, background: isOnline ? '#4cd964' : '#888' }} />

                  {/* info overlay */}
                  <div style={S.infoOverlay}>
                    <div style={S.nameText}>
                      {profile.username}
                    </div>
                    {metaLine ? <div style={S.metaText}>{metaLine}</div> : null}
                    {lastSeen ? <div style={S.lastSeenText}>{lastSeen}</div> : null}
                  </div>
                </div>

                {/* Like / X buttons */}
                <div style={S.actions}>
                  <button style={S.btnX} onClick={e => { e.stopPropagation(); }}>✕</button>
                  <button style={S.btnHeart} onClick={e => { e.stopPropagation(); }}>♥</button>
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
  page: { background: '#111', minHeight: '100vh', paddingBottom: 80 },
  header: {
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#1a1a1a',
    borderBottom: '1px solid #333',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: 800, color: '#fff' },
  onlinePill: { display: 'flex', alignItems: 'center', gap: 5, background: '#1e3a1e', borderRadius: 12, padding: '4px 10px' },
  onlineDot: { width: 7, height: 7, borderRadius: '50%', background: '#4cd964' },
  onlineCount: { fontSize: 12, fontWeight: 700, color: '#4cd964' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '2px',
    padding: '2px',
  },
  card: {
    background: '#222',
    cursor: 'pointer',
    position: 'relative',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  photoWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '3/4',
    background: '#333',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%', objectFit: 'cover' },
  overlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '60%',
    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
    pointerEvents: 'none',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 5, left: 5,
    width: 18, height: 18,
    borderRadius: '50%',
    background: '#3b82f6',
    color: '#fff',
    fontSize: 10,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineBadge: {
    position: 'absolute',
    top: 5, right: 5,
    width: 10, height: 10,
    borderRadius: '50%',
    border: '2px solid #000',
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: '8px 6px 4px',
    zIndex: 1,
  },
  nameText: {
    color: '#fff',
    fontWeight: 700,
    fontSize: '12px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  metaText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '10px',
    marginTop: '1px',
  },
  lastSeenText: {
    color: '#4cd964',
    fontSize: '9px',
    marginTop: '1px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '6px 4px',
    background: '#1a1a1a',
  },
  btnX: {
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px 12px',
  },
  btnHeart: {
    background: 'none',
    border: 'none',
    color: '#e91e63',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 12px',
  },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#666', fontSize: 14 },
};