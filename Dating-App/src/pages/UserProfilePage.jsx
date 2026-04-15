// src/pages/UserProfilePage.jsx
// หน้าดูโปรไฟล์คนอื่น — route /profile/:userId
// Dark theme #0f172a / #1e293b | Accent #e91e63

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return 'เพิ่งออนไลน์';
  if (diff < 3600)  return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(diff / 86400)} วันที่แล้ว`;
}

export default function UserProfilePage() {
  const { userId }  = useParams();
  const navigate    = useNavigate();
  const [profile, setProfile]         = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const load = async () => {
      // ดึง session ของผู้ใช้ปัจจุบัน
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      setCurrentUserId(session.user.id);

      // ดึงโปรไฟล์เป้าหมาย
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio, photos, age, gender, height, education, occupation, relationship_goal, interests, city, location, last_seen_at, is_verified')
        .eq('id', userId)
        .maybeSingle();

      if (error) console.error(error);
      setProfile(data ?? null);
      setLoading(false);
    };
    load();
  }, [userId, navigate]);

  if (loading) {
    return (
      <div style={S.loadWrap}>
        <div style={S.spinner} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={S.loadWrap}>
        <p style={{ color: '#64748b' }}>ไม่พบโปรไฟล์นี้</p>
      </div>
    );
  }

  const avatar = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=e91e63&color=fff&size=400`;
  const isOnlineNow = profile.last_seen_at && (Date.now() - new Date(profile.last_seen_at)) < 5 * 60 * 1000;
  const lastSeenText = isOnlineNow ? 'ออนไลน์อยู่' : timeAgo(profile.last_seen_at);

  // photos เป็น text[] — filter null/empty ออก
  const photoList = Array.isArray(profile.photos) ? profile.photos.filter(Boolean) : [];

  // interests เป็น jsonb — อาจเป็น array of strings
  const interestList = Array.isArray(profile.interests) ? profile.interests : [];

  const handleSendMessage = () => {
    const chatId = getChatId(currentUserId, profile.id);
    navigate(`/room-chat/${chatId}`);
  };

  return (
    <div style={S.page}>

      {/* ── Back button ── */}
      <button style={S.backBtn} onClick={() => navigate(-1)}>
        ← กลับ
      </button>

      {/* ── Hero photo ── */}
      <div style={S.heroWrap}>
        <img src={avatar} alt={profile.username} style={S.heroImg} />
        <div style={S.heroGradient} />
        <div style={S.heroInfo}>
          <div style={S.nameRow}>
            <span style={S.name}>{profile.username || '—'}</span>
            {profile.age  && <span style={S.ageBadge}>{profile.age}</span>}
            {profile.is_verified && (
              <span style={S.verifiedBadge}>✓ Verified</span>
            )}
          </div>
          <div style={S.subRow}>
            <span style={isOnlineNow ? S.onlineDot : S.offlineDot} />
            <span style={{ color: isOnlineNow ? '#4ade80' : '#94a3b8' }}>
              {lastSeenText}
            </span>
            {(profile.city || profile.location) && (
              <>
                <span style={{ color: '#475569' }}>·</span>
                <span>📍 {profile.city || profile.location}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={S.body}>

        {/* Send Message button */}
        <button style={S.msgBtn} onClick={handleSendMessage}>
          💬 ส่งข้อความ
        </button>

        {/* Bio */}
        {profile.bio && (
          <div style={S.section}>
            <div style={S.sectionLabel}>เกี่ยวกับฉัน</div>
            <p style={S.bioText}>{profile.bio}</p>
          </div>
        )}

        {/* Details */}
        {(profile.gender || profile.height || profile.education || profile.occupation || profile.relationship_goal) && (
          <div style={S.section}>
            <div style={S.sectionLabel}>ข้อมูลทั่วไป</div>
            <div style={S.chipRow}>
              {profile.gender           && <Chip icon="🧑"  label={profile.gender} />}
              {profile.height           && <Chip icon="📏"  label={profile.height} />}
              {profile.education        && <Chip icon="🎓"  label={profile.education} />}
              {profile.occupation       && <Chip icon="💼"  label={profile.occupation} />}
              {profile.relationship_goal && <Chip icon="💬" label={profile.relationship_goal} />}
            </div>
          </div>
        )}

        {/* Interests */}
        {interestList.length > 0 && (
          <div style={S.section}>
            <div style={S.sectionLabel}>ความสนใจ</div>
            <div style={S.tagRow}>
              {interestList.map((t, i) => (
                <span key={i} style={S.tag}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Photos grid */}
        <div style={S.section}>
          <div style={S.sectionLabel}>รูปภาพทั้งหมด</div>
          {photoList.length === 0 ? (
            <p style={{ color: '#475569', fontSize: 13 }}>ยังไม่มีรูปภาพ</p>
          ) : (
            <div style={S.photoGrid}>
              {photoList.map((url, i) => (
                <img key={i} src={url} alt={`photo-${i}`} style={S.photo} />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Fixed bottom CTA ── */}
      <div style={S.bottomBar}>
        <button style={S.msgBtnBottom} onClick={handleSendMessage}>
          💬 ส่งข้อความ
        </button>
      </div>

    </div>
  );
}

function Chip({ icon, label }) {
  return (
    <div style={S.chip}>
      <span>{icon}</span>
      <span style={{ color: '#cbd5e1', fontSize: 13 }}>{label}</span>
    </div>
  );
}

const S = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#f1f5f9',
    fontFamily: "'Segoe UI', sans-serif",
    paddingBottom: 90,
  },
  loadWrap: {
    minHeight: '100vh',
    background: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid rgba(233,30,99,0.2)',
    borderTopColor: '#e91e63',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },

  // Back button
  backBtn: {
    position: 'fixed',
    top: 14,
    left: 14,
    zIndex: 50,
    background: 'rgba(15,23,42,0.75)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#f1f5f9',
    borderRadius: 999,
    padding: '7px 16px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },

  // Hero
  heroWrap: {
    position: 'relative',
    width: '100%',
    maxWidth: 600,
    margin: '0 auto',
  },
  heroImg: {
    width: '100%',
    aspectRatio: '3 / 4',
    objectFit: 'cover',
    display: 'block',
    maxHeight: 520,
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '55%',
    background: 'linear-gradient(to top, #0f172a 0%, transparent 100%)',
    pointerEvents: 'none',
  },
  heroInfo: {
    position: 'absolute',
    bottom: 20, left: 20, right: 20,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 26,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  ageBadge: {
    background: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    padding: '2px 10px',
    fontSize: 15,
    fontWeight: 500,
  },
  verifiedBadge: {
    background: 'linear-gradient(135deg, #e91e63, #ff6090)',
    borderRadius: 999,
    padding: '2px 10px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.3,
  },
  subRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    fontSize: 13,
    color: '#94a3b8',
    flexWrap: 'wrap',
  },
  onlineDot: {
    display: 'inline-block',
    width: 8, height: 8,
    borderRadius: '50%',
    background: '#4ade80',
    flexShrink: 0,
  },
  offlineDot: {
    display: 'inline-block',
    width: 8, height: 8,
    borderRadius: '50%',
    background: '#475569',
    flexShrink: 0,
  },

  // Body
  body: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '0 16px',
  },
  msgBtn: {
    display: 'block',
    width: '100%',
    marginTop: 20,
    padding: '14px 0',
    background: 'linear-gradient(135deg, #e91e63, #ff4081)',
    border: 'none',
    borderRadius: 14,
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 0.3,
  },

  // Sections
  section: {
    marginTop: 24,
    paddingBottom: 20,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '1.2px',
    marginBottom: 12,
  },
  bioText: {
    margin: 0,
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 1.8,
  },

  // Chips
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#1e293b',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 999,
    padding: '6px 14px',
    fontSize: 13,
  },

  // Tags
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    background: 'rgba(233,30,99,0.1)',
    border: '1px solid rgba(233,30,99,0.28)',
    color: '#e91e63',
    borderRadius: 999,
    padding: '5px 14px',
    fontSize: 13,
    fontWeight: 500,
  },

  // Photos
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 4,
  },
  photo: {
    width: '100%',
    aspectRatio: '1 / 1',
    objectFit: 'cover',
    borderRadius: 8,
  },

  // Bottom CTA
  bottomBar: {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    padding: '12px 16px',
    background: 'rgba(15,23,42,0.92)',
    backdropFilter: 'blur(12px)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  msgBtnBottom: {
    display: 'block',
    width: '100%',
    maxWidth: 600,
    margin: '0 auto',
    padding: '14px 0',
    background: 'linear-gradient(135deg, #e91e63, #ff4081)',
    border: 'none',
    borderRadius: 14,
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 0.3,
  },
};