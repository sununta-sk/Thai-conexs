// src/pages/UserProfilePage.jsx
// หน้าดูโปรไฟล์คนอื่น — route /profile/:userId
// White/pink theme เหมือน Login | Accent #e91e63

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function extractPhotoUrl(p) {
  if (!p) return null;
  if (typeof p === 'string') {
    try { return JSON.parse(p)?.url || p; } catch { return p; }
  }
  return p?.url || null;
}

const FREE_LIMIT = 3;

// ── Photo Carousel ──────────────────────────────────────────
function PhotoCarousel({ photos, isSubscriber, onUpgrade }) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(null);
  const touchEndX   = useRef(null);

  if (!photos || photos.length === 0) return null;

  // เลื่อนได้เสมอ ไม่ว่าจะ locked หรือไม่
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

  const isLocked = !isSubscriber && current >= FREE_LIMIT;

  return (
    <div style={C.wrap}>
      <div style={C.slider} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

        <img
          key={current}
          src={photos[current]}
          alt={`photo-${current}`}
          style={{ ...C.img, filter: isLocked ? 'blur(18px)' : 'none', transform: isLocked ? 'scale(1.1)' : 'scale(1)' }}
        />

        {!isLocked && <div style={C.gradient} />}

        {isLocked && (
          <div style={C.lockOverlay}>
            <div style={C.lockBoxWrap}>
              <div style={C.lockBox}>
                <div style={C.lockIcon}>🔒</div>
                <div style={C.lockTitle}>Priority Members Only</div>
                <div style={C.lockSub}>This content is only available to Priority Members</div>
                <button style={C.lockBtn} onClick={onUpgrade}>
                  🚀 Get your boarding pass to full access
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Arrows — แสดงเสมอ */}
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
                style={{
                  ...C.dot,
                  opacity: i === current ? 1 : 0.35,
                  width: i === current ? 18 : 6,
                  background: (!isSubscriber && i >= FREE_LIMIT) ? '#e91e63' : '#fff',
                }}
                onClick={() => setCurrent(i)}
              />
            ))}
          </div>
        )}

        {photos.length > 1 && (
          <div style={C.counter}>{current + 1} / {photos.length}</div>
        )}

        {!isSubscriber && photos.length > FREE_LIMIT && (
          <div style={C.freeBadge}>
            🔓 {Math.min(current + 1, FREE_LIMIT)}/{FREE_LIMIT} free
          </div>
        )}
      </div>
    </div>
  );
}

const C = {
  wrap: { position: 'relative', width: '100%', maxWidth: 480, margin: '0 auto' },
  slider: { position: 'relative', width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', background: '#fce4ec', touchAction: 'pan-y' },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', userSelect: 'none', WebkitUserDrag: 'none', transition: 'filter 0.3s, transform 0.3s' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%)', pointerEvents: 'none' },
  arrowLeft: { position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.75)', border: 'none', borderRadius: '50%', color: '#333', fontSize: 22, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
  arrowRight: { position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.75)', border: 'none', borderRadius: '50%', color: '#333', fontSize: 22, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
  dots: { position: 'absolute', bottom: 14, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5, zIndex: 3 },
  dot: { height: 6, borderRadius: 999, cursor: 'pointer', transition: 'all 0.2s ease' },
  counter: { position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)', borderRadius: 999, padding: '3px 10px', fontSize: 12, color: '#fff', fontWeight: 600, zIndex: 3 },
  freeBadge: { position: 'absolute', top: 12, left: 12, background: 'rgba(233,30,99,0.85)', borderRadius: 999, padding: '3px 10px', fontSize: 11, color: '#fff', fontWeight: 700, zIndex: 3 },
  lockOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4, padding: 20, pointerEvents: 'none' },
  lockBoxWrap: { pointerEvents: 'auto' },
  lockBox: { textAlign: 'center', padding: '24px 20px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', borderRadius: 20, boxShadow: '0 8px 32px rgba(233,30,99,0.2)', maxWidth: 280 },
  lockIcon: { fontSize: 36, marginBottom: 8 },
  lockTitle: { fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 },
  lockSub: { fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.5 },
  lockBtn: { width: '100%', padding: '12px 16px', background: 'linear-gradient(135deg, #e91e63, #c2185b)', border: 'none', borderRadius: 30, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', lineHeight: 1.4 },
};

// ── Main Page ───────────────────────────────────────────────
export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate   = useNavigate();

  const [profile, setProfile]           = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [loading, setLoading]           = useState(true);

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

      const { data: me } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', session.user.id)
        .maybeSingle();

      const plan = me?.subscription_plan;
      setIsSubscriber(plan === 'gold' || plan === 'platinum');
      setLoading(false);
    };
    load();
  }, [userId, navigate]);

  if (loading) return <div style={S.loadWrap}><div style={S.spinner} /></div>;
  if (!profile) return <div style={S.loadWrap}><p style={{ color: '#999' }}>Profile not found</p></div>;

  const d          = profile.details || {};
  const age        = d.age        || '';
  const gender     = d.gender     || '';
  const height     = d.height     || '';
  const weight     = d.weight     || '';
  const education  = d.education  || '';
  const lookingFor = d.lookingFor || '';

  const rawPhotos = Array.isArray(profile.photos) ? profile.photos : [];
  const photoUrls = rawPhotos.map(extractPhotoUrl).filter(Boolean);
  const avatar    = profile.avatar_url || null;
  const allPhotos = avatar ? [avatar, ...photoUrls.filter(u => u !== avatar)] : photoUrls;

  const displayCity  = profile.city || profile.location || '';
  const isOnlineNow  = profile.last_seen_at && (Date.now() - new Date(profile.last_seen_at)) < 5 * 60 * 1000;
  const lastSeenText = isOnlineNow ? 'Online' : timeAgo(profile.last_seen_at);

  const handleSendMessage = () => navigate(`/room-chat/${getChatId(currentUserId, profile.id)}`);
  const handleUpgrade     = () => navigate('/subscription');

  return (
    <div style={S.page}>

      <button style={S.backBtn} onClick={() => navigate(-1)}>← Back</button>

      <PhotoCarousel
        photos={allPhotos}
        isSubscriber={isSubscriber}
        onUpgrade={handleUpgrade}
      />

      <div style={S.card}>
        <div style={S.nameRow}>
          <span style={S.name}>{profile.username || '—'}</span>
          {age && <span style={S.ageBadge}>{age}</span>}
          {profile.is_verified && <span style={S.verifiedBadge}>✓ Verified</span>}
        </div>

        <div style={S.subRow}>
          <span style={isOnlineNow ? S.onlineDot : S.offlineDot} />
          <span style={{ color: isOnlineNow ? '#4caf50' : '#aaa', fontSize: 13 }}>{lastSeenText}</span>
          {displayCity && (
            <>
              <span style={{ color: '#ddd' }}>·</span>
              <span style={{ fontSize: 13, color: '#888' }}>📍 {displayCity}</span>
            </>
          )}
        </div>

        <button style={S.msgBtn} onClick={handleSendMessage}>
          💬 Send Message
        </button>

        {profile.bio && (
          <div style={S.section}>
            <div style={S.sectionLabel}>About Me</div>
            <p style={S.bioText}>{profile.bio}</p>
          </div>
        )}

        {(gender || height || weight || education || lookingFor) && (
          <div style={S.section}>
            <div style={S.sectionLabel}>General Info</div>
            <div style={S.chipRow}>
              {gender     && <Chip icon="🧑"  label={gender} />}
              {height     && <Chip icon="📏"  label={`${height} cm`} />}
              {weight     && <Chip icon="⚖️"  label={`${weight} kg`} />}
              {education  && <Chip icon="🎓"  label={education} />}
              {lookingFor && <Chip icon="💬"  label={lookingFor} />}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function Chip({ icon, label }) {
  return (
    <div style={S.chip}>
      <span>{icon}</span>
      <span style={{ color: '#555', fontSize: 13 }}>{label}</span>
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', background: 'linear-gradient(145deg, #fce4ec, #fdf0f5)', fontFamily: "'Segoe UI', sans-serif", paddingBottom: 40 },
  loadWrap: { minHeight: '100vh', background: 'linear-gradient(145deg, #fce4ec, #fdf0f5)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  spinner: { width: 32, height: 32, border: '3px solid rgba(233,30,99,0.2)', borderTopColor: '#e91e63', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  backBtn: { position: 'fixed', top: 14, left: 14, zIndex: 50, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(233,30,99,0.2)', color: '#e91e63', borderRadius: 999, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, boxShadow: '0 2px 8px rgba(233,30,99,0.1)' },
  card: { maxWidth: 480, margin: '0 auto', background: '#fff', borderRadius: '0 0 24px 24px', padding: '20px 20px 28px', boxShadow: '0 4px 20px rgba(233,30,99,0.08)' },
  nameRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 24, fontWeight: 800, color: '#1a1a2e' },
  ageBadge: { background: '#fce4ec', borderRadius: 999, padding: '2px 10px', fontSize: 14, fontWeight: 600, color: '#e91e63' },
  verifiedBadge: { background: 'linear-gradient(135deg, #e91e63, #c2185b)', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 0.3 },
  subRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  onlineDot: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#4caf50', flexShrink: 0 },
  offlineDot: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ccc', flexShrink: 0 },
  msgBtn: { display: 'block', width: '100%', marginTop: 16, padding: '14px 0', background: 'linear-gradient(135deg, #e91e63, #c2185b)', border: 'none', borderRadius: 30, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.3, boxShadow: '0 4px 12px rgba(233,30,99,0.3)' },
  section: { marginTop: 20, paddingBottom: 16, borderBottom: '1px solid #fce4ec' },
  sectionLabel: { fontSize: 11, fontWeight: 800, color: '#e91e63', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 10 },
  bioText: { margin: 0, fontSize: 14, color: '#555', lineHeight: 1.8 },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: { display: 'flex', alignItems: 'center', gap: 6, background: '#fdf0f5', border: '1px solid #f8bbd0', borderRadius: 999, padding: '6px 14px', fontSize: 13 },
};