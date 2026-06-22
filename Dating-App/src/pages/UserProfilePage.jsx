// src/pages/UserProfilePage.jsx
// Dark admin theme | Accent #e91e63

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import ReportModal from '../components/ReportModal';

import { optimizeImage } from '../lib/imageUtils';
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
          src={optimizeImage(photos[current], { width: 1000, quality: 80 })}
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
  wrap: { position: 'relative', width: '100%' },
  slider: { position: 'relative', width: '100%', aspectRatio: '4 / 5', overflow: 'hidden', background: '#1e293b', touchAction: 'pan-y' },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', userSelect: 'none', WebkitUserDrag: 'none', transition: 'filter 0.3s, transform 0.3s' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)', pointerEvents: 'none' },
  arrowLeft: { position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', background: 'rgba(30, 41, 59, 0.85)', border: '1px solid #334155', borderRadius: '50%', color: '#f1f5f9', fontSize: 22, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
  arrowRight: { position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)', background: 'rgba(30, 41, 59, 0.85)', border: '1px solid #334155', borderRadius: '50%', color: '#f1f5f9', fontSize: 22, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
  dots: { position: 'absolute', bottom: 14, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5, zIndex: 3 },
  dot: { height: 6, borderRadius: 999, cursor: 'pointer', transition: 'all 0.2s ease' },
  counter: { position: 'absolute', top: 12, right: 12, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', borderRadius: 999, padding: '3px 10px', fontSize: 12, color: '#fff', fontWeight: 600, zIndex: 3, border: '1px solid #334155' },
  freeBadge: { position: 'absolute', top: 12, left: 12, background: 'rgba(233,30,99,0.9)', borderRadius: 999, padding: '3px 10px', fontSize: 11, color: '#fff', fontWeight: 700, zIndex: 3 },
  lockOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4, padding: 20, pointerEvents: 'none' },
  lockBoxWrap: { pointerEvents: 'auto' },
  lockBox: { textAlign: 'center', padding: '24px 20px', background: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(8px)', borderRadius: 20, boxShadow: '0 8px 32px rgba(233,30,99,0.3)', maxWidth: 280, border: '1px solid #334155' },
  lockIcon: { fontSize: 36, marginBottom: 8 },
  lockTitle: { fontSize: 16, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 },
  lockSub: { fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.5 },
  lockBtn: { width: '100%', padding: '12px 16px', background: 'linear-gradient(135deg, #e91e63, #c2185b)', border: 'none', borderRadius: 30, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', lineHeight: 1.4 },
};

// ── Main Page ───────────────────────────────────────────────
export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate   = useNavigate();

  const [profile, setProfile]           = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [liked, setLiked]               = useState(false);
  const [passed, setPassed]             = useState(false);
  const [reportOpen, setReportOpen]     = useState(false);
  const [loading, setLoading]           = useState(true);

  // Desktop redirect to chat (this page is mobile-only)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 900) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) navigate('/room-chat/' + getChatId(session.user.id, userId), { replace: true });
        else navigate('/login', { replace: true });
      });
    }
  }, [userId, navigate]);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      if (window.innerWidth >= 900) return; // Desktop redirects, skip load
      setCurrentUserId(session.user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio, photos, details, lifestyle, city, location, last_seen_at, is_verified')
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
      const lk = await supabase.from('user_likes').select('id').eq('liker_id', session.user.id).eq('liked_id', userId).maybeSingle();
      setLiked(Boolean(lk.data));

      const ps = await supabase.from('user_passes').select('id').eq('passer_id', session.user.id).eq('passed_id', userId).maybeSingle();
      setPassed(Boolean(ps.data));

      // Track profile view (don't track if viewing own profile)
      if (session.user.id !== userId) {
        const { error: viewError } = await supabase.from('profile_views').insert({
          viewer_id: session.user.id,
          viewed_id: userId,
        });
        if (viewError) console.error('[ProfileView] ERROR:', viewError);
      }

      setLoading(false);
    };
    load();
  }, [userId, navigate]);

  if (loading) return <div style={S.loadWrap}><div style={S.spinner} /><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>;
  if (!profile) return <div style={S.loadWrap}><p style={{ color: '#94a3b8' }}>Profile not found</p></div>;

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

  const handleLike = async () => {
    if (!currentUserId || !profile?.id) return;
    if (liked) {
      const r = await supabase.from('user_likes').delete().match({ liker_id: currentUserId, liked_id: profile.id });
      if (!r.error) setLiked(false);
    } else {
      const r = await supabase.from('user_likes').insert({ liker_id: currentUserId, liked_id: profile.id });
      if (!r.error) setLiked(true);
    }
  };

  const handlePass = async () => {
    if (!currentUserId || !profile?.id) return;
    if (passed) {
      // Undo pass
      const r = await supabase.from('user_passes').delete().match({ passer_id: currentUserId, passed_id: profile.id });
      if (!r.error) setPassed(false);
    } else {
      const r = await supabase.from('user_passes').insert({ passer_id: currentUserId, passed_id: profile.id });
      if (!r.error) {
        setPassed(true);
        // Navigate away — they don't want to see this profile
        setTimeout(() => navigate('/discover'), 400);
      }
    }
  };

  const handleBlock = async () => {
    if (!window.confirm(`Block ${profile.username || 'this user'}? You won't see them in Discover or receive messages from them.`)) return;
    const { error } = await supabase.from('user_blocks').insert({ blocker_id: currentUserId, blocked_id: profile.id });
    if (error) { alert('Failed to block: ' + error.message); return; }
    alert('User blocked successfully');
    navigate('/discover');
  };

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
          <span style={{ color: isOnlineNow ? '#4ade80' : '#94a3b8', fontSize: 13 }}>{lastSeenText}</span>
          {displayCity && (
            <>
              <span style={{ color: '#475569' }}>·</span>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>📍 {displayCity}</span>
            </>
          )}
        </div>

        <button style={S.msgBtn} onClick={handleSendMessage}>
          💬 Send Message
        </button>

        <div style={S.actionRow}>
          <button style={liked ? S.likedBtn : S.likeBtn} onClick={handleLike}>
            {liked ? '❤ Liked' : '♡ Like'}
          </button>
          <button style={passed ? S.passedBtn : S.passBtn} onClick={handlePass}>
            {passed ? '✓ Passed' : '✕ Pass'}
          </button>
        </div>

        <button style={S.reportBtn} onClick={() => setReportOpen(true)}>
          ⚠ Report User
        </button>

        <button style={S.blockBtn} onClick={handleBlock}>
          🚫 Block User
        </button>

        {profile.bio && (
          <div style={S.section}>
            <div style={S.sectionLabel}>About Me</div>
            <p style={S.bioText}>{profile.bio}</p>
          </div>
        )}

        {profile.lifestyle && Object.values(profile.lifestyle).some(v => v && (Array.isArray(v) ? v.length > 0 : true)) && (
          <div style={{ padding: '16px 0', borderTop: '1px solid #334155', marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#e91e63', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.2 }}>✨ Lifestyle</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Array.isArray(profile.lifestyle.hobbies) && profile.lifestyle.hobbies.map(h => (
                <span key={h} style={{ padding: '6px 14px', borderRadius: 999, background: 'rgba(233, 30, 99, 0.15)', color: '#f9a8d4', fontSize: 12, fontWeight: 600, border: '1px solid rgba(233, 30, 99, 0.3)' }}>{h}</span>
              ))}
              {profile.lifestyle.sleepSchedule && <span style={{ padding: '6px 14px', borderRadius: 999, background: 'rgba(124, 58, 237, 0.15)', color: '#c4b5fd', fontSize: 12, fontWeight: 600, border: '1px solid rgba(124, 58, 237, 0.3)' }}>{profile.lifestyle.sleepSchedule}</span>}
              {profile.lifestyle.drinking && <span style={{ padding: '6px 14px', borderRadius: 999, background: 'rgba(3, 105, 161, 0.15)', color: '#7dd3fc', fontSize: 12, fontWeight: 600, border: '1px solid rgba(3, 105, 161, 0.3)' }}>{profile.lifestyle.drinking}</span>}
              {profile.lifestyle.smoking && <span style={{ padding: '6px 14px', borderRadius: 999, background: 'rgba(133, 77, 14, 0.2)', color: '#fde68a', fontSize: 12, fontWeight: 600, border: '1px solid rgba(133, 77, 14, 0.4)' }}>{profile.lifestyle.smoking}</span>}
              {profile.lifestyle.exercise && <span style={{ padding: '6px 14px', borderRadius: 999, background: 'rgba(22, 101, 52, 0.2)', color: '#86efac', fontSize: 12, fontWeight: 600, border: '1px solid rgba(22, 101, 52, 0.4)' }}>{profile.lifestyle.exercise}</span>}
              {profile.lifestyle.personality && <span style={{ padding: '6px 14px', borderRadius: 999, background: '#0f172a', color: '#cbd5e1', fontSize: 12, fontWeight: 600, border: '1px solid #334155' }}>{profile.lifestyle.personality}</span>}
            </div>
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

      {reportOpen && (
        <ReportModal
          targetUserId={profile.id}
          targetUsername={profile.username}
          onClose={() => setReportOpen(false)}
        />
      )}
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
  page: { minHeight: '100vh', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif", paddingBottom: 100 },
  loadWrap: { minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  spinner: { width: 32, height: 32, border: '3px solid rgba(233,30,99,0.2)', borderTopColor: '#e91e63', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  backBtn: { position: 'fixed', top: 'calc(env(safe-area-inset-top) + 14px)', left: 14, zIndex: 50, background: 'rgba(30, 41, 59, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(233,30,99,0.3)', color: '#e91e63', borderRadius: 999, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
  card: { maxWidth: 480, margin: '0 auto', background: '#1e293b', borderRadius: 24, padding: '20px 20px 28px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', border: '1px solid #334155', marginTop: 12 },
  nameRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 24, fontWeight: 800, color: '#f1f5f9' },
  ageBadge: { background: 'rgba(233, 30, 99, 0.2)', borderRadius: 999, padding: '2px 10px', fontSize: 14, fontWeight: 600, color: '#f9a8d4', border: '1px solid rgba(233, 30, 99, 0.4)' },
  verifiedBadge: { background: 'linear-gradient(135deg, #e91e63, #c2185b)', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 0.3 },
  subRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  onlineDot: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#4ade80', flexShrink: 0, boxShadow: '0 0 6px #4ade80' },
  offlineDot: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#475569', flexShrink: 0 },
  msgBtn: { display: 'block', width: '100%', marginTop: 16, padding: '14px 0', background: 'linear-gradient(135deg, #e91e63, #c2185b)', border: 'none', borderRadius: 30, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.3, boxShadow: '0 4px 12px rgba(233,30,99,0.4)' },
  actionRow: { display: 'flex', gap: 8, marginTop: 10 },
  likeBtn: { flex: 1, padding: '11px 0', background: 'transparent', border: '1px solid #e91e6366', borderRadius: 30, color: '#e91e63', fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: 0.3 },
  likedBtn: { flex: 1, padding: '11px 0', background: '#e91e63', border: '1px solid #e91e63', borderRadius: 30, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.3 },
  passBtn: { flex: 1, padding: '11px 0', background: 'transparent', border: '1px solid #64748b66', borderRadius: 30, color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: 0.3 },
  passedBtn: { flex: 1, padding: '11px 0', background: '#475569', border: '1px solid #475569', borderRadius: 30, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.3 },
  reportBtn: { display: 'block', width: '100%', marginTop: 10, padding: '11px 0', background: 'transparent', border: '1px solid #f59e0b66', borderRadius: 30, color: '#f59e0b', fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: 0.3 },
  blockBtn: { display: 'block', width: '100%', marginTop: 10, padding: '11px 0', background: 'transparent', border: '1px solid #ef444466', borderRadius: 30, color: '#ef4444', fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: 0.3 },
  section: { marginTop: 20, paddingBottom: 16, borderBottom: '1px solid #334155' },
  sectionLabel: { fontSize: 11, fontWeight: 800, color: '#e91e63', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 10 },
  bioText: { margin: 0, fontSize: 14, color: '#cbd5e1', lineHeight: 1.8 },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: { display: 'flex', alignItems: 'center', gap: 6, background: '#0f172a', border: '1px solid #334155', borderRadius: 999, padding: '6px 14px', fontSize: 13 },
};
