// src/pages/UserProfilePage.jsx
// หน้าดูโปรไฟล์คนอื่น — route /profile/:userId
// Dark theme #0f172a / #1e293b | Accent #e91e63

import { useEffect, useState, useRef } from 'react';
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

// photos column เก็บเป็น array ของ object {url, cropX, cropY, scale}
// หรืออาจเป็น JSON string ของ object — แกะ .url ออกมา
function extractPhotoUrl(p) {
  if (!p) return null;
  if (typeof p === 'string') {
    try {
      const parsed = JSON.parse(p);
      return parsed?.url || p;
    } catch {
      return p; // เป็น URL ตรงๆ
    }
  }
  return p?.url || null;
}

// ── Photo Carousel ──────────────────────────────────────────
function PhotoCarousel({ photos }) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(null);
  const touchEndX   = useRef(null);

  if (!photos || photos.length === 0) return null;

  const prev = () => setCurrent(i => (i - 1 + photos.length) % photos.length);
  const next = () => setCurrent(i => (i + 1) % photos.length);

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchMove  = (e) => { touchEndX.current = e.touches[0].clientX; };
  const onTouchEnd   = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchStartX.current = null;
    touchEndX.current   = null;
  };

  return (
    <div style={C.wrap}>
      <div
        style={C.slider}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img
          key={current}
          src={photos[current]}
          alt={`photo-${current}`}
          style={C.img}
        />
        <div style={C.gradient} />

        {photos.length > 1 && (
          <>
            <button style={C.arrowLeft}  onClick={prev}>‹</button>
            <button style={C.arrowRight} onClick={next}>›</button>
          </>
        )}

        {photos.length > 1 && (
          <div style={C.dots}>
            {photos.map((_, i) => (
              <div
                key={i}
                style={{ ...C.dot, opacity: i === current ? 1 : 0.35, width: i === current ? 18 : 6 }}
                onClick={() => setCurrent(i)}
              />
            ))}
          </div>
        )}

        {photos.length > 1 && (
          <div style={C.counter}>{current + 1} / {photos.length}</div>
        )}
      </div>
    </div>
  );
}

const C = {
  wrap: { position: 'relative', width: '100%', maxWidth: 600, margin: '0 auto' },
  slider: {
    position: 'relative', width: '100%', aspectRatio: '1 / 1',
    overflow: 'hidden', background: '#1e293b', touchAction: 'pan-y',
  },
  img: {
    width: '100%', height: '100%', objectFit: 'cover',
    display: 'block', userSelect: 'none', WebkitUserDrag: 'none',
  },
  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
    background: 'linear-gradient(to top, #0f172a 0%, transparent 100%)',
    pointerEvents: 'none',
  },
  arrowLeft: {
    position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%',
    color: '#fff', fontSize: 22, width: 36, height: 36,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  arrowRight: {
    position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%',
    color: '#fff', fontSize: 22, width: 36, height: 36,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  dots: {
    position: 'absolute', bottom: 60, left: 0, right: 0,
    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5, zIndex: 2,
  },
  dot: { height: 6, borderRadius: 999, background: '#fff', cursor: 'pointer', transition: 'all 0.2s ease' },
  counter: {
    position: 'absolute', top: 12, right: 12,
    background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
    borderRadius: 999, padding: '3px 10px',
    fontSize: 12, color: '#fff', fontWeight: 600, zIndex: 2,
  },
};

// ── Main Page ───────────────────────────────────────────────
export default function UserProfilePage() {
  const { userId }  = useParams();
  const navigate    = useNavigate();
  const [profile, setProfile]             = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      setCurrentUserId(session.user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio, photos, details, city, location, last_seen_at, is_verified')
        .eq('id', userId)
        .maybeSingle();

      if (error) console.error(error);
      setProfile(data ?? null);
      setLoading(false);
    };
    load();
  }, [userId, navigate]);

  if (loading) {
    return <div style={S.loadWrap}><div style={S.spinner} /></div>;
  }

  if (!profile) {
    return <div style={S.loadWrap}><p style={{ color: '#64748b' }}>ไม่พบโปรไฟล์นี้</p></div>;
  }

  // ── แกะข้อมูลจาก details jsonb ──
  const d = profile.details || {};
  const age          = d.age        || '';
  const gender       = d.gender     || '';
  const height       = d.height     || '';
  const weight       = d.weight     || '';
  const education    = d.education  || '';
  const lookingFor   = d.lookingFor || '';

  // ── photos: array of {url, cropX, cropY, scale} หรือ JSON string ──
  const rawPhotos = Array.isArray(profile.photos) ? profile.photos : [];
  const photoUrls = rawPhotos.map(extractPhotoUrl).filter(Boolean);

  // รวม avatar_url เป็นรูปแรก ถ้ายังไม่มีใน photoUrls
  const avatar = profile.avatar_url || null;
  const allPhotos = avatar
    ? [avatar, ...photoUrls.filter(u => u !== avatar)]
    : photoUrls;

  // ── location: เอา city ก่อน, fallback location ──
  const displayCity = profile.city || profile.location || '';

  const isOnlineNow  = profile.last_seen_at && (Date.now() - new Date(profile.last_seen_at)) < 5 * 60 * 1000;
  const lastSeenText = isOnlineNow ? 'ออนไลน์อยู่' : timeAgo(profile.last_seen_at);

  const handleSendMessage = () => {
    navigate(`/room-chat/${getChatId(currentUserId, profile.id)}`);
  };

  return (
    <div style={S.page}>

      {/* Back button */}
      <button style={S.backBtn} onClick={() => navigate(-1)}>← กลับ</button>

      {/* Carousel */}
      <PhotoCarousel photos={allPhotos} />

      {/* Info under carousel */}
      <div style={S.heroInfo}>
        <div style={S.nameRow}>
          <span style={S.name}>{profile.username || '—'}</span>
          {age && <span style={S.ageBadge}>{age}</span>}
          {profile.is_verified && <span style={S.verifiedBadge}>✓ Verified</span>}
        </div>
        <div style={S.subRow}>
          <span style={isOnlineNow ? S.onlineDot : S.offlineDot} />
          <span style={{ color: isOnlineNow ? '#4ade80' : '#94a3b8' }}>{lastSeenText}</span>
          {displayCity && (
            <>
              <span style={{ color: '#475569' }}>·</span>
              <span>📍 {displayCity}</span>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={S.body}>

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
        {(gender || height || weight || education || lookingFor) && (
          <div style={S.section}>
            <div style={S.sectionLabel}>ข้อมูลทั่วไป</div>
            <div style={S.chipRow}>
              {gender     && <Chip icon="🧑"  label={gender} />}
              {height     && <Chip icon="📏"  label={`${height} ซม.`} />}
              {weight     && <Chip icon="⚖️"  label={`${weight} กก.`} />}
              {education  && <Chip icon="🎓"  label={education} />}
              {lookingFor && <Chip icon="💬"  label={lookingFor} />}
            </div>
          </div>
        )}

      </div>

      {/* Fixed bottom CTA */}
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
    minHeight: '100vh', background: '#0f172a',
    color: '#f1f5f9', fontFamily: "'Segoe UI', sans-serif", paddingBottom: 90,
  },
  loadWrap: {
    minHeight: '100vh', background: '#0f172a',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  spinner: {
    width: 32, height: 32,
    border: '3px solid rgba(233,30,99,0.2)',
    borderTopColor: '#e91e63', borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  backBtn: {
    position: 'fixed', top: 14, left: 14, zIndex: 50,
    background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9',
    borderRadius: 999, padding: '7px 16px', cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
  },
  heroInfo: { maxWidth: 600, margin: '0 auto', padding: '14px 20px 4px' },
  nameRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 24, fontWeight: 700 },
  ageBadge: {
    background: 'rgba(255,255,255,0.15)', borderRadius: 999,
    padding: '2px 10px', fontSize: 14, fontWeight: 500,
  },
  verifiedBadge: {
    background: 'linear-gradient(135deg, #e91e63, #ff6090)',
    borderRadius: 999, padding: '2px 10px',
    fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
  },
  subRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginTop: 6, fontSize: 13, color: '#94a3b8', flexWrap: 'wrap',
  },
  onlineDot: {
    display: 'inline-block', width: 8, height: 8,
    borderRadius: '50%', background: '#4ade80', flexShrink: 0,
  },
  offlineDot: {
    display: 'inline-block', width: 8, height: 8,
    borderRadius: '50%', background: '#475569', flexShrink: 0,
  },
  body: { maxWidth: 600, margin: '0 auto', padding: '0 16px' },
  msgBtn: {
    display: 'block', width: '100%', marginTop: 16, padding: '14px 0',
    background: 'linear-gradient(135deg, #e91e63, #ff4081)',
    border: 'none', borderRadius: 14, color: '#fff',
    fontSize: 16, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.3,
  },
  section: {
    marginTop: 24, paddingBottom: 20,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  sectionLabel: {
    fontSize: 11, fontWeight: 700, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 12,
  },
  bioText: { margin: 0, fontSize: 14, color: '#cbd5e1', lineHeight: 1.8 },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 999, padding: '6px 14px', fontSize: 13,
  },
  bottomBar: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    padding: '12px 16px', background: 'rgba(15,23,42,0.92)',
    backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  msgBtnBottom: {
    display: 'block', width: '100%', maxWidth: 600, margin: '0 auto',
    padding: '14px 0', background: 'linear-gradient(135deg, #e91e63, #ff4081)',
    border: 'none', borderRadius: 14, color: '#fff',
    fontSize: 16, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.3,
  },
};