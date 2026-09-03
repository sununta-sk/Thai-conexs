// src/pages/RoomChat.jsx
import { useEffect, useRef, useState, useCallback, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useIsMobile, useIsDesktop } from "../hooks/useIsMobile";
import { useTranslation } from "../hooks/useTranslation";
import { useOnline } from "../context/OnlineContext";
import MobileRoomChat from "../components/MobileRoomChat";
import { optimizeImage } from "../lib/imageUtils";
import { useAuditLogger } from "../hooks/useAuditLogger";
import PhotoEnlargeModal from "../components/PhotoEnlargeModal";

// ── Sound notifications ──
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}
// Unlock audio on first user interaction
if (typeof window !== 'undefined') {
  const unlock = () => {
    getAudioCtx();
    document.removeEventListener('click', unlock);
    document.removeEventListener('touchstart', unlock);
    document.removeEventListener('keydown', unlock);
  };
  document.addEventListener('click', unlock);
  document.addEventListener('touchstart', unlock);
  document.addEventListener('keydown', unlock);
}

function playSound(type) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'send') {
      // "whoosh" - low-pitch quick tone
      osc.frequency.setValueAtTime(880, ctx.currentTime);  // ✅
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'receive') {
      // "ding" - Facebook-like double-tone
      osc.frequencueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {}
}



const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY;
const FREE_LIMIT = 3;
const OFFICIAL_ID = "00000000-0000-0000-0000-000000000001";
// Emoji picker (component + ~460KB emoji dataset) is only fetched once the user
// actually opens the emoji tray, instead of being bundled into every chat page load.
const EmojiPicker = lazy(() => import("@emoji-mart/react"));

function getChatId(uid1, uid2) { return [uid1, uid2].sort().join("_"); }
function formatTime(iso) { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function formatDateSeparator(iso) {
  const d = new Date(iso), now = new Date();
  const diff = Math.floor((now - d) / 1000 / 60 / 60);
  if (diff < 1) return "Just now";
  if (diff < 24) return `${diff} hour${diff > 1 ? "s" : ""} ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
function extractPhotoUrl(p) {
  if (!p) return null;
  if (typeof p === "string") { try { return JSON.parse(p)?.url || p; } catch { return p; } }
  return p?.url || null;
}
function timeAgo(dateStr) {
  if (!dateStr) return "Offline";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function SidebarPhotoCarousel({ photos, isSubscriber, onUpgrade, isVip }) {
  const [current, setCurrent] = useState(0);
  const [enlarged, setEnlarged] = useState(false);

  const validPhotos = (photos || []).map(extractPhotoUrl).filter(p => p && p.startsWith('http'));

  // Preload the adjacent (prev/next) photo off-DOM at its original URL, so
  // the browser already has it cached by the time the user actually taps
  // prev/next - this is the fix for "photos open slow between first &
  // second etc": previously only the CURRENT photo was ever fetched, on
  // demand. (This used to also request a resized/compressed version via
  // optimizeImage()'s Supabase render/image transform, but that transform
  // endpoint isn't confirmed working on this project - see the reverted
  // src attribute below for the full explanation. Reverted here too so the
  // preloaded request actually matches what the visible <img> will use.)
  // Keyed on validPhotos.join(',') rather than the array itself, since
  // RoomChatDesktop's 1s message-poll re-renders this component every
  // second with a freshly-built (but same-content) photos array - without
  // this, the effect would refire and re-request every poll tick.
  useEffect(() => {
    if (validPhotos.length <= 1) return;
    const neighbors = [(current + 1) % validPhotos.length, (current - 1 + validPhotos.length) % validPhotos.length];
    neighbors.forEach(i => { new Image().src = validPhotos[i]; });
  }, [current, validPhotos.join(',')]);

  if (validPhotos.length === 0) {
    return <div style={SC.noPhoto}>No photos</div>;
  }
  const prev = () => setCurrent(i => (i - 1 + validPhotos.length) % validPhotos.length);
  const next = () => setCurrent(i => (i + 1) % validPhotos.length);
  const isLocked = !isSubscriber && current >= FREE_LIMIT;
  const src = validPhotos[current];

  return (
    <div style={SC.wrap}>
      {/* VIP ring: same .tcn-vip-frame technique as Discover's card photo
          and Navbar's avatar - here wrapping just the <img> (not the
          arrows/dots/counter/lock-overlay siblings below, which stay
          positioned against SC.wrap itself) so the shimmer reads as a
          border inset from SC.wrap's own rounded edge. */}
      <div className={isVip ? 'tcn-vip-frame' : undefined} style={isVip ? SC.vipFrame : SC.vipFrameOff}>
        <img
          key={current}
          // Reverted from optimizeImage(src, {...}) back to the raw URL: that
          // routed every photo through Supabase Storage's image-transform
          // ("/storage/v1/render/image/") endpoint, which is a plan-gated
          // feature not confirmed enabled on this project - real photos
          // started failing to load and silently falling back to the
          // onError silhouette below. Raw object URLs are the same ones
          // that were already working before Task C.
          src={src}
          alt=""
          style={{ ...SC.img, filter: isLocked ? 'blur(18px)' : 'none', transform: isLocked ? 'scale(1.1)' : 'scale(1)', cursor: isLocked ? 'default' : 'zoom-in' }}
          onClick={() => { if (!isLocked) setEnlarged(true); }}
          onError={(e) => {
            e.target.src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150"><rect width="150" height="150" fill="#1e293b"/><text x="50%" y="50%" font-size="80" text-anchor="middle" dominant-baseline="central">👤</text></svg>');
          }}
        />
      </div>

      {enlarged && !isLocked && (
        <PhotoEnlargeModal
          photos={validPhotos}
          startIndex={current}
          isSubscriber={isSubscriber}
          freeLimit={FREE_LIMIT}
          onUpgrade={onUpgrade}
          onClose={() => setEnlarged(false)}
          onIndexChange={setCurrent}
          lockLabels={{ title: 'Priority Members Only', sub: 'Available to Priority Members', btn: '🚀 Upgrade for full access' }}
        />
      )}

      {isLocked && (
        <div style={SC.lockOverlay}>
          <div style={SC.lockBox}>
            <div style={SC.lockIcon}>🔒</div>
            <div style={SC.lockTitle}>Priority Members Only</div>
            <div style={SC.lockSub}>Available to Priority Members</div>
            <button style={SC.lockBtn} onClick={onUpgrade}>🚀 Upgrade for full access</button>
          </div>
        </div>
      )}

      {validPhotos.length > 1 && (
        <>
          <button style={{ ...SC.arrow, left: 8 }} onClick={prev}>‹</button>
          <button style={{ ...SC.arrow, right: 8 }} onClick={next}>›</button>
          <div style={SC.counter}>{current + 1} / {validPhotos.length}</div>
          <div style={SC.dots}>
            {validPhotos.map((_, i) => (
              <div key={i} style={{ ...SC.dot, background: i === current ? '#e91e63' : 'rgba(255,255,255,0.6)' }} onClick={() => setCurrent(i)} />
            ))}
          </div>
        </>
      )}

      {!isSubscriber && validPhotos.length > FREE_LIMIT && (
        <div style={SC.freeBadge}>🔓 {Math.min(current + 1, FREE_LIMIT)}/{FREE_LIMIT} free</div>
      )}
    </div>
  );
}

const SC = {
  // Explicit height (not just aspectRatio) so the box size can't depend on
  // aspect-ratio resolving correctly against a percentage-height child img -
  // 400 = DS.inner's 300px maxWidth at a 3:4 ratio (300 * 4/3). If DS.inner's
  // maxWidth ever changes, this needs updating to match.
  wrap: { position: 'relative', width: '100%', height: 400, borderRadius: 16, overflow: 'hidden', background: '#0f172a', marginBottom: 8, border: '1px solid #334155' },
  // object-fit: contain (not cover) so the full photo is always visible,
  // letterboxed/pillarboxed rather than cropped - the empty bars show
  // SC.wrap's own background (#0f172a, the app's dark theme color) through
  // the img's own transparent, unpainted space.
  img: { width: '100%', height: '100%', objectFit: 'contain', display: 'block', transition: 'filter 0.3s, transform 0.3s' },
  // VIP ring: same .tcn-vip-frame rotating-gradient technique as Discover's
  // vipFrame, just wrapping this fixed-height rectangular photo box instead
  // of Discover's aspect-ratio square card. width/height 100% (of SC.wrap)
  // + padding 3, boxSizing border-box, so the wrapped <img> (itself
  // width/height 100%) shrinks by the padding automatically.
  vipFrameOff: { display: 'block', width: '100%', height: '100%' },
  vipFrame: { display: 'block', position: 'relative', overflow: 'hidden', width: '100%', height: '100%', padding: 3, boxSizing: 'border-box' },
  // Same fixed height as SC.wrap, so the empty-state box is identically
  // sized to the photo-filled one - the sidebar shouldn't shift depending
  // on whether a profile happens to have photos.
  noPhoto: { width: '100%', height: 400, borderRadius: 16, background: '#0f172a', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 13, marginBottom: 8 },
  arrow: { position: 'absolute', top: '50%', transform: 'translateY(-50%)', background: 'rgba(30, 41, 59, 0.9)', border: '1px solid #334155', borderRadius: '50%', width: 32, height: 32, fontSize: 22, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.4)', color: '#f1f5f9', lineHeight: 1, paddingBottom: 3, zIndex: 5 },
  counter: { position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 12, zIndex: 3 },
  freeBadge: { position: 'absolute', top: 10, left: 10, background: 'rgba(233,30,99,0.9)', borderRadius: 999, padding: '3px 10px', fontSize: 11, color: '#fff', fontWeight: 700, zIndex: 3 },
  dots: { position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5, zIndex: 3 },
  dot: { width: 6, height: 6, borderRadius: '50%', cursor: 'pointer' },
  lockOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4, padding: 20 },
  lockBox: { textAlign: 'center', padding: '20px 16px', background: 'rgba(30, 41, 59, 0.95)', border: '1px solid #334155', borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', maxWidth: 220 },
  lockIcon: { fontSize: 32, marginBottom: 6 },
  lockTitle: { fontSize: 14, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 },
  lockSub: { fontSize: 12, color: '#94a3b8', marginBottom: 12, lineHeight: 1.4 },
  lockBtn: { width: '100%', padding: '10px 12px', background: 'linear-gradient(135deg, #e91e63, #c2185b)', border: 'none', borderRadius: 24, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
};

function DesktopSidebar({ profile, allPhotos, isOnline, isRecentlyActive, onlineStatusText, isSubscriber, onUpgrade, onBlock, liked, onLike }) {
  const d = profile?.details || {};
  const age = d.age || '';
  const gender = d.gender || '';
  const height = d.height || '';
  const weight = d.weight || '';
  const education = d.education || '';
  const lookingFor = d.lookingFor || '';
  const city = profile?.city || d.city || '';
  const bio = profile?.bio || profile?.about_me || '';

  // Bio is clamped to 2 lines by default (keeps the sidebar compact on short
  // screens) with a "...more" toggle to reveal the rest inline. Whether the
  // toggle is even shown is decided by measuring the actual rendered text -
  // scrollHeight > clientHeight only once the 2-line clamp is actually
  // cutting something off, so short bios don't get a pointless "...more".
  const bioRef = useRef(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [bioClamped, setBioClamped] = useState(false);
  useEffect(() => {
    if (bioRef.current) setBioClamped(bioRef.current.scrollHeight > bioRef.current.clientHeight + 1);
  }, [bio]);

  return (
    <div style={DS.wrap}>
      <div style={DS.inner}>
        <SidebarPhotoCarousel photos={allPhotos} isSubscriber={isSubscriber} onUpgrade={onUpgrade} isVip={profile?.subscription_plan === 'gold' || profile?.subscription_plan === 'platinum'} />

        <div style={DS.nameRow}>
          <span style={DS.name}>{profile?.username ?? 'User'}</span>
          {profile?.is_verified && <span style={DS.verified}>✓ Verified</span>}
          {(profile?.subscription_plan === 'gold' || profile?.subscription_plan === 'platinum') && <span style={DS.vip}>VIP</span>}
          {profile?.is_founder_member && <span style={DS.founder}>🌟 Founder</span>}
        </div>

        <div style={DS.statusRow}>
          <div style={{ ...DS.statusDot, background: isOnline ? '#4caf50' : isRecentlyActive ? '#fbbf24' : '#64748b' }} />
          <span style={{ ...DS.statusText, color: isOnline ? '#4caf50' : isRecentlyActive ? '#fbbf24' : '#94a3b8' }}>{onlineStatusText}</span>
        </div>

        {city && <div style={DS.city}>📍 {city}</div>}

        {bio && (
          <>
            <div style={DS.sectionTitle}>ABOUT ME</div>
            <div ref={bioRef} style={bioExpanded ? DS.bioText : DS.bioTextClamped}>{bio}</div>
            {bioClamped && (
              <button type="button" style={DS.bioToggle} onClick={() => setBioExpanded(v => !v)}>
                {bioExpanded ? 'Show less' : '...more'}
              </button>
            )}
          </>
        )}

        <div style={DS.sectionTitle}>GENERAL INFO</div>
        <div style={DS.chipRow}>
          {gender && <span style={DS.chip}>👤 {gender}</span>}
          {age && <span style={DS.chip}>🎂 {age}</span>}
          {height && <span style={DS.chip}>📏 {height} cm</span>}
          {weight && <span style={DS.chip}>⚖️ {weight} kg</span>}
          {education && <span style={DS.chip}>🎓 {education}</span>}
          {lookingFor && <span style={DS.chip}>💬 {lookingFor}</span>}
        </div>

        <button style={liked ? DS.likedBtn : DS.likeBtn} onClick={onLike}>{liked ? '❤ Liked' : '♡ Like'}</button>
        <button style={DS.blockBtn} onClick={onBlock}>🚫 Block User</button>
      </div>
    </div>
  );
}

const DS = {
  // alignItems: 'flex-start' (overriding the flex default 'stretch') matters
  // on short screens: 'stretch' would force .inner to exactly match wrap's
  // own (viewport-bound) height, and since .inner is itself a column flex
  // container, its children - including the fixed-height photo box - would
  // then get flex-shrunk to fit that height instead of overflowing it, so
  // the overflowY: 'auto' below would never actually get anything to
  // scroll. 'flex-start' lets .inner size to its natural content height,
  // so it can genuinely exceed wrap's height and scroll - verified with a
  // headless render at a 600px viewport (13"-laptop-short) before/after.
  wrap: { width: 360, flexShrink: 0, background: '#1e293b', borderRight: '1px solid #334155', overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' },
  inner: { width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '80px 20px 28px', gap: 10 },
  nameRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  name: { fontSize: 22, fontWeight: 800, color: '#f1f5f9' },
  verified: { fontSize: 11, fontWeight: 700, color: '#fff', background: '#e91e63', borderRadius: 99, padding: '3px 9px' },
  vip: { fontSize: 11, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: 99, padding: '3px 9px', letterSpacing: 0.3 },
  founder: { fontSize: 11, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', borderRadius: 99, padding: '3px 9px', letterSpacing: 0.3 },
  statusRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: '50%' },
  statusText: { fontSize: 13, fontWeight: 700 },
  city: { fontSize: 13, color: '#94a3b8', fontWeight: 600 },
  sectionTitle: { fontSize: 11, fontWeight: 800, color: '#e91e63', letterSpacing: 0.6, marginTop: 14, alignSelf: 'flex-start' },
  bioText: { fontSize: 14, color: '#cbd5e1', lineHeight: 1.5, fontWeight: 500, alignSelf: 'flex-start', textAlign: 'left' },
  bioTextClamped: { fontSize: 14, color: '#cbd5e1', lineHeight: 1.5, fontWeight: 500, alignSelf: 'flex-start', textAlign: 'left', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  bioToggle: { alignSelf: 'flex-start', background: 'none', border: 'none', color: '#e91e63', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '2px 0 0', marginTop: -4 },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  chip: { fontSize: 12, fontWeight: 600, background: 'rgba(233, 30, 99, 0.15)', border: '1px solid rgba(233, 30, 99, 0.3)', color: '#e91e63', padding: '5px 10px', borderRadius: 99 },
  likeBtn: { marginTop: 16, width: '100%', padding: '10px 0', background: 'transparent', border: '1px solid #e91e6366', borderRadius: 24, color: '#e91e63', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  likedBtn: { marginTop: 16, width: '100%', padding: '10px 0', background: '#e91e63', border: '1px solid #e91e63', borderRadius: 24, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  blockBtn: { marginTop: 10, width: '100%', padding: '10px 0', background: 'transparent', border: '1px solid #ef444466', borderRadius: 24, color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};

function GifPicker({ onSelect }) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchGifs(""); }, []);

  const fetchGifs = async (q) => {
    setLoading(true);
    try {
      const endpoint = q
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=20&rating=g`;
      const res = await fetch(endpoint);
      const json = await res.json();
      setGifs(json.data || []);
    } catch (e) { console.error("Giphy error:", e); } finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.length === 0 || val.length >= 2) fetchGifs(val);
  };

  return (
    <div style={GP.wrap}>
      <input autoFocus placeholder="Search GIFs..." value={query} onChange={handleSearch} style={GP.input} />
      <div style={GP.grid}>
        {loading && <div style={GP.loading}>Loading...</div>}
        {!loading && gifs.map(gif => (
          <img key={gif.id} src={gif.images.fixed_height_small.url} alt={gif.title} style={GP.gif} onClick={() => onSelect(gif.images.original.url)} />
        ))}
      </div>
      <div style={GP.poweredBy}>Powered by GIPHY</div>
    </div>
  );
}

const GP = {
  wrap: { width: 300, background: "#1e293b", border: '1px solid #334155', borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.5)", overflow: "hidden", display: "flex", flexDirection: "column" },
  input: { margin: 10, padding: "8px 12px", borderRadius: 20, border: "1px solid #334155", fontSize: 14, outline: "none", background: "#0f172a", color: '#f1f5f9' },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: "0 10px 8px", maxHeight: 260, overflowY: "auto" },
  gif: { width: "100%", borderRadius: 8, cursor: "pointer", objectFit: "cover", aspectRatio: "1/1" },
  loading: { gridColumn: "1/-1", textAlign: "center", color: "#64748b", fontSize: 13, padding: 20 },
  poweredBy: { textAlign: "center", fontSize: 10, color: "#64748b", padding: "4px 0 8px", fontWeight: 700, letterSpacing: 0.5 },
};

function RoomChatDesktop() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { lang } = useTranslation(['common']);
  const { getTier, touchActivity } = useOnline();

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [otherProfile, setOtherProfile] = useState(null);
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showTicket, setShowTicket] = useState(false);
  const [ticketMsg, setTicketMsg] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiData, setEmojiData] = useState(null);
  const [showGif, setShowGif] = useState(false);
  const [isSubscriber, setIsSubscriber] = useState(false);

  useEffect(() => {
    if (!showEmoji || emojiData) return;
    import("@emoji-mart/data").then((m) => setEmojiData(m.default));
  }, [showEmoji, emojiData]);

  // ── Admin: quick "Official Account" private message ──
  const { logAction } = useAuditLogger();
  const [isAdmin, setIsAdmin] = useState(false);
  const [otherIsAdmin, setOtherIsAdmin] = useState(false);
  const [showOfficialMsg, setShowOfficialMsg] = useState(false);
  const [officialTitle, setOfficialTitle] = useState('');
  const [officialBody, setOfficialBody] = useState('');
  const [officialSending, setOfficialSending] = useState(false);

  const submitReport = async () => {
    if (!reportReason || !session) return;
    await supabase.from('content_reports').insert({ reporter_id: session.user.id, reported_user_id: otherUserId, report_type: reportReason, status: 'open' });
    setShowReport(false); setReportReason(''); alert('ส่ง Report เรียบร้อยแล้ว');
  };
  const submitBlock = async () => {
    if (!session || !otherUserId) return;
    if (!window.confirm("Block this user? You won't see them in Discover or receive messages.")) return;
    const r = await supabase.from('user_blocks').insert({ blocker_id: session.user.id, blocked_id: otherUserId });
    if (r.error) { alert('Failed to block: ' + r.error.message); return; }
    alert('User blocked successfully');
    navigate('/discover');
  };
  const submitTicket = async () => {
    if (!ticketMsg || !session) return;
    await supabase.from('support_tickets').insert({ user_id: session.user.id, subject: 'Chat issue', message: ticketMsg, status: 'open', priority: 'medium' });
    setShowTicket(false); setTicketMsg(''); alert(lang === 'th' ? 'ส่ง Ticket เรียบร้อยแล้ว' : 'Ticket sent successfully');
  };
  const submitOfficialMessage = async () => {
    if (!officialTitle.trim() || !officialBody.trim() || !otherUserId) return;
    setOfficialSending(true);
    const announceEmoji = String.fromCodePoint(0x1F4E2);
    const content = announceEmoji + ' ' + officialTitle.trim() + '\n\n' + officialBody.trim();
    const chat_id = [otherUserId, OFFICIAL_ID].sort().join('_');
    const { error } = await supabase.from('messages').insert({ chat_id, room_id: chat_id, sender_id: OFFICIAL_ID, content });
    if (error) { alert('Failed to send: ' + error.message); setOfficialSending(false); return; }
    await logAction({
      action_type: 'announcement_publish',
      target_type: 'app_user',
      target_id: otherUserId,
      metadata: { title: officialTitle.trim(), private: true, to_username: otherProfile?.username },
    }).catch(console.error);
    setShowOfficialMsg(false); setOfficialTitle(''); setOfficialBody(''); setOfficialSending(false);
    alert('Sent to ' + (otherProfile?.username || 'user') + ' via Official Account');
  };

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const photoScrollRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const gifPickerRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const audioChunks = useRef([]);

  useEffect(() => {
    if (!showEmoji) return;
    const h = (e) => { if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) setShowEmoji(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showEmoji]);

  useEffect(() => {
    if (!showGif) return;
    const h = (e) => { if (gifPickerRef.current && !gifPickerRef.current.contains(e.target)) setShowGif(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showGif]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) setSession(data.session); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') navigate("/login"); else if (s) setSession(s);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!session) return;
    supabase.from('profiles').select('subscription_plan').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => {
        const plan = data?.subscription_plan;
        setIsSubscriber(plan === 'gold' || plan === 'platinum');
      });
  }, [session]);

  useEffect(() => {
    if (!session) { setIsAdmin(false); return; }
    supabase.from('admin_users').select('id').eq('auth_user_id', session.user.id).eq('is_active', true).maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  const otherUserId = session ? chatId.split("_").find((id) => id !== session.user.id) : null;

  useEffect(() => {
    if (!otherUserId) { setOtherIsAdmin(false); return; }
    supabase.from('admin_users').select('id').eq('auth_user_id', otherUserId).eq('is_active', true).maybeSingle()
      .then(({ data }) => setOtherIsAdmin(!!data));
  }, [otherUserId]);
  const [liked, setLiked] = useState(false);
  const handleLike = async () => {
    if (!session || !otherUserId) return;
    if (liked) {
      const r = await supabase.from('user_likes').delete().match({ liker_id: session.user.id, liked_id: otherUserId });
      if (!r.error) setLiked(false);
    } else {
      const r = await supabase.from('user_likes').insert({ liker_id: session.user.id, liked_id: otherUserId });
      if (!r.error) setLiked(true);
    }
  };
  useEffect(() => {
    if (!session || !otherUserId) return;
    supabase.from('user_likes').select('id').eq('liker_id', session.user.id).eq('liked_id', otherUserId).maybeSingle().then(({ data }) => setLiked(Boolean(data)));
  }, [session, otherUserId]);

  useEffect(() => {
    if (!otherUserId || !session) return;
    supabase.from("profiles").select("id, username, avatar_url, photos, details, city, last_seen_at, is_verified, bio, subscription_plan, is_founder_member").eq("id", otherUserId).single()
      .then(({ data }) => { if (data) setOtherProfile(data); });
    // Opening a chat is an activity moment - touch last_seen_at right away
    // instead of waiting for OnlineContext's own heartbeat interval.
    touchActivity();
    // Track profile view when opening chat (so the other user gets a toast notification)
    supabase.from('profile_views').insert({
      viewer_id: session.user.id,
      viewed_id: otherUserId,
    }).then(({ error }) => {
      if (error) console.error('[ProfileView from chat] ERROR:', error);
    });
    // Depend on the stable user id, not the session object itself: session
    // gets set from two independent async sources (getSession() and
    // onAuthStateChange's initial fire) which produce different object
    // references for the same logical session, which was causing this
    // effect - and the profile_views insert with it - to fire twice per
    // chat open.
  }, [otherUserId, session?.user?.id]);

  // Online/recently-active status for otherUserId comes from OnlineContext's
  // shared getTier (below), which already tracks a single app-wide presence
  // channel — no need for a second, chat-room-scoped presence channel here.

  useEffect(() => {
    if (!session || !chatId) return;
    const fetch_ = async () => {
      // Fetch the newest 100 messages (descending), then reverse for display.
      // Previously this ordered ascending with the same range, which always
      // returned the OLDEST 100 messages once a chat passed 100 total —
      // permanently hiding every message sent after that, including new ones.
      const { data, error } = await supabase.from("messages").select("*").eq("chat_id", chatId).order("created_at", { ascending: false }).range(0, 99);
      if (!error) setMessages((data || []).slice().reverse());
      setLoading(false);
    };
    fetch_();
    supabase.from("messages").update({ is_read: true }).eq("chat_id", chatId).neq("sender_id", session.user.id);
    const channel = supabase.channel(`room:${chatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          if (payload.new.sender_id !== session.user.id) {
            
            supabase.from("messages").update({ is_read: true }).eq("id", payload.new.id);
          }
        })
      .subscribe();
    // Realtime (above) is the primary delivery path - this is a slow
    // reconciliation safety net, not the mechanism instant delivery
    // relies on (that's the optimistic local update in sendMessage).
    // Was 1000ms, doing the same full-table job as realtime every single
    // second for as long as the chat stayed open; the actual history
    // (see 5680ff9/d830e81) shows this was only ever meant to catch a
    // realtime failure, not run at primary-delivery frequency.
    const poll = setInterval(async () => {
      const { data } = await supabase.from("messages").select("*").eq("chat_id", chatId).order("created_at", { ascending: false }).range(0, 99);
      if (data) setMessages(data.slice().reverse());
    }, 20000);

    // Realtime's websocket can be throttled/suspended by the browser
    // while the tab is backgrounded - reconcile immediately on return
    // instead of waiting for the next slow poll tick, so a message sent
    // while this tab was hidden shows up right away rather than up to
    // 20s late.
    const reconcileFn = async () => {
      if (document.visibilityState !== 'visible') return;
      const { data } = await supabase.from("messages").select("*").eq("chat_id", chatId).order("created_at", { ascending: false }).range(0, 99);
      if (data) setMessages(data.slice().reverse());
    };
    document.addEventListener('visibilitychange', reconcileFn);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      document.removeEventListener('visibilitychange', reconcileFn);
    };
  }, [session, chatId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = useCallback(async (content_override) => {
    const content = (content_override || newMessage).trim();
    if (!content || !session || sending) return;
    setSending(true);
    const tempMsg = { id: "temp-" + Date.now(), chat_id: chatId, room_id: chatId, sender_id: session.user.id, content, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    if (!content_override) setNewMessage("");
    const { error } = await supabase.from("messages").insert({ chat_id: chatId, room_id: chatId, sender_id: session.user.id, content });
    if (!error) { playSound('send'); touchActivity(); }
    if (error) { console.error("Send error:", error); if (!content_override) setNewMessage(content); }
    setSending(false);
    inputRef.current?.focus();
  }, [newMessage, session, chatId, sending, touchActivity]);

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const handleEmojiSelect = (emoji) => { setNewMessage(prev => prev + emoji.native); setShowEmoji(false); inputRef.current?.focus(); };

  const handleGifSelect = (gifUrl) => {
    setShowGif(false);
    sendMessage(gifUrl);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunks.current = [];
      recorder.ondataavailable = (e) => audioChunks.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const path = `chat/${session.user.id}/${Date.now()}.webm`;
        const { error } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'audio/webm' });
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
          await sendMessage(publicUrl);
        }
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (e) { console.error('Mic error:', e); }
  };
  const stopRecording = () => {
    if (mediaRecorder) { mediaRecorder.stop(); setRecording(false); setMediaRecorder(null); }
  };

  const handleUpgrade = () => navigate('/subscription');

  const profileAge    = otherProfile?.details?.age    ?? "";
  const profileGender = otherProfile?.details?.gender ?? "";
  const profileCity   = otherProfile?.city ?? otherProfile?.details?.city ?? "";
  const rawPhotos = Array.isArray(otherProfile?.photos) ? otherProfile.photos : [];
  const photoUrls = rawPhotos.map(extractPhotoUrl).filter(Boolean);
  const avatarUrl = extractPhotoUrl(otherProfile?.avatar_url);
  const allPhotos = [...(avatarUrl ? [avatarUrl] : []), ...photoUrls.filter(u => u !== avatarUrl)];
  const activityTier = getTier(otherUserId, otherProfile?.last_seen_at);
  const isOnline = activityTier === 'online';
  const isRecentlyActive = activityTier === 'recently_active';
  // "Xd ago" (raw last-seen timestamp text) is intentionally hidden - same
  // principle as the earlier Discover-card fix (2408ea6): with a low
  // current user count, an exact/relative stale time makes low activity
  // too visible. Online/Recently Active are tier labels, not raw
  // timestamps, so they're unaffected; the status dot is untouched too.
  const onlineStatusText = isOnline ? "Online" : isRecentlyActive ? "Recently Active" : "";

  if (loading) {
    return (
      <div style={S.loadingScreen}>
        <div style={S.loadingDot} /><div style={{ ...S.loadingDot, animationDelay: "0.15s" }} /><div style={{ ...S.loadingDot, animationDelay: "0.3s" }} />
        <style>{`@keyframes bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-8px); opacity: 1; } }`}</style>
      </div>
    );
  }

  const chatColumn = (
    <div style={S.page}>
      {/* Was a `@import url(...)` inside the <style> tag below - that can't
          be discovered by the browser until this component has already
          rendered (page-chat is a lazy chunk), and a nested @import is
          lower network priority than a real <link>. React 19 hoists a
          rendered <link rel="stylesheet"> into <head> and dedupes by href,
          so this is fetched as soon as this component mounts instead of
          after the enclosing <style> block gets parsed. index.html has the
          matching preconnect hints so the connection is already warm by the
          time this fires. Performance audit Area 3 / Task D. */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" />
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-8px); opacity: 1; } }
        .msg-bubble { animation: fadeUp 0.2s ease; }
        .send-btn:active { transform: scale(0.92); }
        .icon-btn:active { transform: scale(0.88); }
        .photo-thumb { transition: transform 0.15s; cursor: pointer; }
        .photo-thumb:hover { transform: scale(1.05); }
        .back-btn-big:hover { background: rgba(233, 30, 99, 0.15); }
        /* Same .tcn-vip-frame class/keyframes as Navbar.jsx's avatar ring and
           Discover's VIP card shimmer - identical rules, reused here for the
           sidebar photo carousel (see SidebarPhotoCarousel/SC.vipFrame). */
        @keyframes vipSpin { to { transform: rotate(360deg); } }
        .tcn-vip-frame::before {
          content: '';
          position: absolute;
          inset: -50%;
          background: conic-gradient(from 0deg, #f06292, #ffb74d, #4fc3f7, #ba68c8, #f06292);
          animation: vipSpin 5s linear infinite;
          will-change: transform;
        }
        .tcn-vip-frame > * { position: relative; z-index: 1; }
      `}</style>

      <div style={S.header}>
        <button className="back-btn-big" style={S.backBtnBig} onClick={() => navigate(-1)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          <span style={{ fontSize: 14, fontWeight: 800 }}>Back</span>
        </button>
        <div style={{ ...S.headerInfo, cursor: 'pointer' }} onClick={() => otherUserId && navigate(`/profile/${otherUserId}`)}>
          <div style={S.nameGenderRow}>
            <span style={S.headerName}>{otherProfile?.username ?? "User"}</span>
            {profileGender && <span style={S.genderBadge}>{profileGender}</span>}
            {(otherProfile?.subscription_plan === 'gold' || otherProfile?.subscription_plan === 'platinum') && <span style={S.vipBadge}>VIP</span>}
            {otherProfile?.is_founder_member && <span style={S.founderBadge}>🌟 Founder</span>}
          </div>
          <div style={S.headerMeta}>{[profileAge, profileCity].filter(Boolean).join(" · ")}</div>
          <div style={S.onlineRow}>
            <div style={{ ...S.onlineDot, background: isOnline ? "#4caf50" : isRecentlyActive ? "#fbbf24" : "#64748b" }} />
            <span style={{ ...S.onlineText, color: isOnline ? "#4caf50" : isRecentlyActive ? "#fbbf24" : "#94a3b8" }}>{onlineStatusText}</span>
          </div>
        </div>
        {!isDesktop && (
          <div style={S.photoStrip} ref={photoScrollRef}>
            {allPhotos.length > 0 ? allPhotos.map((url, i) => (
              <img key={i} src={url} alt="" className="photo-thumb" style={S.photoThumb} onClick={() => otherUserId && navigate(`/profile/${otherUserId}`)} />
            )) : (
              <div style={{ ...S.photoPlaceholder, cursor: 'pointer' }} onClick={() => otherUserId && navigate(`/profile/${otherUserId}`)}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#64748b"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
              </div>
            )}
          </div>
        )}
        {isDesktop && <div style={{ flex: 1 }} />}
        {isAdmin && !otherIsAdmin && (
          <button style={S.officialMsgBtn} onClick={() => setShowOfficialMsg(true)}>📢 Send Official Message</button>
        )}
        <div style={{position:'relative'}}>
          <button style={S.moreBtn} onClick={() => setShowMenu(v => !v)}><span style={S.moreDots}>···</span></button>
          {showMenu && (
            <div style={{position:'absolute',right:0,top:'110%',background:'#1e293b',borderRadius:12,boxShadow:'0 4px 20px rgba(0,0,0,0.5)',zIndex:100,minWidth:160,overflow:'hidden',border:'1px solid #334155'}}>
              <button onClick={() => { setShowReport(true); setShowMenu(false); }} style={{display:'block',width:'100%',padding:'12px 16px',border:'none',background:'none',textAlign:'left',cursor:'pointer',fontSize:14,color:'#e91e63'}}>🚨 Report User</button>
              <button onClick={() => { setShowTicket(true); setShowMenu(false); }} style={{display:'block',width:'100%',padding:'12px 16px',border:'none',background:'none',textAlign:'left',cursor:'pointer',fontSize:14,color:'#cbd5e1'}}>🎫 Support Ticket</button>
            </div>
          )}
        </div>
        {showReport && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={() => setShowReport(false)}>
            <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:16,padding:24,width:300}} onClick={e => e.stopPropagation()}>
              <div style={{fontWeight:700,marginBottom:12,color:'#f1f5f9'}}>Report User</div>
              {['harassment','fake_profile','inappropriate_photo','spam','scam','underage','other'].map(r => (
                <label key={r} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,cursor:'pointer',color:'#cbd5e1'}}>
                  <input type="radio" name="reason" value={r} onChange={() => setReportReason(r)} />
                  <span style={{fontSize:14,textTransform:'capitalize'}}>{r.replace('_',' ')}</span>
                </label>
              ))}
              <button onClick={submitReport} style={{marginTop:12,width:'100%',padding:'10px',background:'#e91e63',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600}}>Send Report</button>
            </div>
          </div>
        )}
        {showTicket && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={() => setShowTicket(false)}>
            <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:16,padding:24,width:300}} onClick={e => e.stopPropagation()}>
              <div style={{fontWeight:700,marginBottom:12,color:'#f1f5f9'}}>Support Ticket</div>
              <textarea value={ticketMsg} onChange={e => setTicketMsg(e.target.value)} placeholder={lang === 'th' ? 'อธิบายปัญหา...' : 'Describe the issue...'} style={{width:'100%',height:100,borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',padding:8,fontSize:14,resize:'none'}} />
              <button onClick={submitTicket} style={{marginTop:12,width:'100%',padding:'10px',background:'#e91e63',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600}}>Send Ticket</button>
            </div>
          </div>
        )}
        {showOfficialMsg && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={() => setShowOfficialMsg(false)}>
            <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:16,padding:24,width:340}} onClick={e => e.stopPropagation()}>
              <div style={{fontWeight:700,marginBottom:4,color:'#f1f5f9'}}>📢 Send Official Message</div>
              <div style={{fontSize:12,color:'#94a3b8',marginBottom:12}}>To {otherProfile?.username ?? 'this user'}, via Official Account</div>
              <input value={officialTitle} onChange={e => setOfficialTitle(e.target.value)} placeholder="Title..." style={{width:'100%',padding:'10px 14px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:14,marginBottom:10,boxSizing:'border-box'}} />
              <textarea value={officialBody} onChange={e => setOfficialBody(e.target.value)} placeholder="Message..." rows={4} style={{width:'100%',padding:'10px 14px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:14,resize:'vertical',boxSizing:'border-box'}} />
              <button onClick={submitOfficialMessage} disabled={officialSending || !officialTitle.trim() || !officialBody.trim()} style={{marginTop:12,width:'100%',padding:'10px',background:'#f59e0b',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,opacity:(officialSending || !officialTitle.trim() || !officialBody.trim())?0.6:1}}>{officialSending ? 'Sending…' : 'Send'}</button>
            </div>
          </div>
        )}
      </div>

      <div style={S.messageArea}>
        {messages.length === 0 && <div style={S.emptyState}>Say hello to {otherProfile?.username ?? "them"} 👋</div>}
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === session?.user?.id;
          const prevMsg = messages[i - 1];
          const showSeparator = !prevMsg || new Date(msg.created_at) - new Date(prevMsg.created_at) > 1000 * 60 * 30;
          const isGif = msg.content?.startsWith("https://media") && msg.content?.includes("giphy.com");
          const isImage = msg.content?.startsWith("https://") && (msg.content?.includes("supabase") || msg.content?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
          const isAudio = msg.content?.includes('supabase') && msg.content?.includes('chat-') && msg.content?.includes('.webm');
          return (
            <div key={msg.id}>
              {showSeparator && <div style={S.separator}>{formatDateSeparator(msg.created_at)}</div>}
              <div style={{ ...S.msgRow, justifyContent: isMine ? "flex-end" : "flex-start" }}>
                {!isMine && <img src={avatarUrl ?? ""} alt="" style={S.msgAvatar} onError={(e) => { e.target.style.display = "none"; }} />}
                <div className="msg-bubble" style={{ ...S.bubble, ...(isMine ? S.bubbleMine : S.bubbleTheirs), ...(isGif ? { background: 'transparent', boxShadow: 'none', padding: 0, border: 'none' } : {}) }}>
                  {isGif ? (
                    <img src={msg.content} alt="gif" style={{ maxWidth: 200, borderRadius: 12, display: 'block' }} />
                  ) : isImage ? (
                    <img src={msg.content} alt="image" style={{ maxWidth: 220, borderRadius: 12, display: 'block' }} />
                  ) : isAudio ? (
                    <audio controls src={msg.content} style={{ maxWidth: 220 }} />
                  ) : (
                    <p style={{ ...S.bubbleText, color: isMine ? '#fff' : '#f1f5f9' }}>{msg.content}</p>
                  )}
                  <span style={{ ...S.bubbleTime, color: isMine ? "rgba(255,255,255,0.7)" : "#64748b", ...(isGif ? { paddingLeft: 4 } : {}) }}>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {showEmoji && (
        <div ref={emojiPickerRef} style={S.emojiPickerWrap}>
          {emojiData && (
            <Suspense fallback={<div style={S.emojiLoading}>Loading…</div>}>
              <EmojiPicker data={emojiData} onEmojiSelect={handleEmojiSelect} theme="dark" previewPosition="none" skinTonePosition="none" maxFrequentRows={2} />
            </Suspense>
          )}
        </div>
      )}

      {showGif && (
        <div ref={gifPickerRef} style={S.gifPickerWrap}>
          <GifPicker onSelect={handleGifSelect} />
        </div>
      )}

      <div style={S.inputBar}>
        <button className="icon-btn" style={{ ...S.iconBtn, background: showEmoji ? 'rgba(233, 30, 99, 0.15)' : 'none', borderRadius: 8 }} onClick={() => { setShowEmoji(v => !v); setShowGif(false); }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e91e63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </button>

        <button className="icon-btn" style={{ ...S.iconBtn, ...S.gifBtn, background: showGif ? '#c2185b' : '#e91e63' }} onClick={() => { setShowGif(v => !v); setShowEmoji(false); }}>
          <span style={S.gifText}>GIF</span>
        </button>

        <button className="icon-btn" style={S.iconBtn} title="Photo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e91e63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
          </svg>
        </button>

        <div style={S.inputWrap}>
          <textarea ref={inputRef} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Message" rows={1} style={S.textInput} />
        </div>

        {newMessage.trim() ? (
          <button className="send-btn" style={S.sendBtn} onClick={() => sendMessage()} disabled={sending}>
            <span style={S.sendText}>Send</span>
          </button>
        ) : (
          <button className="icon-btn" style={{...S.iconBtn, background: recording ? 'rgba(233, 30, 99, 0.15)' : 'none', borderRadius: 8}} title="Voice" onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={recording ? "#f87171" : "#e91e63"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <div style={{ display: 'flex', height: '100dvh', background: '#0f172a', overflow: 'hidden' }}>
        <DesktopSidebar
          profile={otherProfile}
          allPhotos={allPhotos}
          isOnline={isOnline}
          isRecentlyActive={isRecentlyActive}
          onlineStatusText={onlineStatusText}
          isSubscriber={isSubscriber}
          onUpgrade={handleUpgrade}
          onBlock={submitBlock}
          liked={liked}
          onLike={handleLike}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {chatColumn}
        </div>
      </div>
    );
  }

  return chatColumn;
}

const S = {
  page: { display: "flex", flexDirection: "column", height: "100dvh", background: "#0f172a", fontFamily: "'Nunito', sans-serif", overflow: "hidden", position: "relative" },
  loadingScreen: { display: "flex", justifyContent: "center", alignItems: "center", height: "100dvh", gap: 8, background: "#0f172a" },
  loadingDot: { width: 10, height: 10, borderRadius: "50%", background: "#e91e63", animation: "bounce 1.2s ease-in-out infinite" },
  header: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px 10px 8px", background: "#1e293b", borderBottom: "1px solid #334155", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", minHeight: 72, position: "relative", zIndex: 10 },
  backBtnBig: { display: 'flex', alignItems: 'center', gap: 6, background: '#0f172a', border: '2px solid #e91e63', cursor: 'pointer', color: '#e91e63', padding: '8px 16px', borderRadius: 24, flexShrink: 0, transition: 'background 0.15s', boxShadow: '0 2px 6px rgba(233,30,99,0.2)' },
  headerInfo: { display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flexShrink: 0, marginLeft: 30 },
  nameGenderRow: { display: "flex", alignItems: "center", gap: 6 },
  headerName: { fontSize: 16, fontWeight: 800, color: "#f1f5f9", whiteSpace: "nowrap" },
  genderBadge: { fontSize: 11, fontWeight: 700, color: "#e91e63", background: "rgba(233, 30, 99, 0.15)", border: '1px solid rgba(233, 30, 99, 0.3)', borderRadius: 99, padding: "1px 8px", whiteSpace: "nowrap" },
  vipBadge: { fontSize: 11, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg, #f59e0b, #d97706)", borderRadius: 99, padding: "1px 8px", whiteSpace: "nowrap", letterSpacing: 0.3 },
  founderBadge: { fontSize: 11, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg, #a855f7, #7c3aed)", borderRadius: 99, padding: "1px 8px", whiteSpace: "nowrap", letterSpacing: 0.3 },
  headerMeta: { fontSize: 12, color: "#94a3b8", fontWeight: 600 },
  onlineRow: { display: "flex", alignItems: "center", gap: 4, marginTop: 1 },
  onlineDot: { width: 7, height: 7, borderRadius: "50%" },
  onlineText: { fontSize: 12, fontWeight: 700 },
  photoStrip: { display: "flex", gap: 6, overflowX: "auto", flex: 1, alignItems: "center", padding: "0 4px", scrollbarWidth: "none" },
  photoThumb: { width: 52, height: 52, borderRadius: 10, objectFit: "cover", border: "2px solid #334155", flexShrink: 0 },
  photoPlaceholder: { width: 52, height: 52, borderRadius: 10, background: "#0f172a", border: '1px solid #334155', display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  moreBtn: { background: "none", border: "none", cursor: "pointer", padding: "4px 6px", flexShrink: 0 },
  moreDots: { fontSize: 22, color: "#94a3b8", letterSpacing: 1, fontWeight: 900 },
  // Same visual chrome (color/border/borderRadius/fontSize/fontWeight/
  // vertical padding) as the button previously had in DesktopSidebar's
  // DS.officialMsgBtn - width:'100%' doesn't make sense in this horizontal
  // header row, so it's swapped for flexShrink:0/whiteSpace:'nowrap', and
  // horizontal padding is added (16px, matching backBtnBig's convention in
  // this same header) since there's no longer a 100%-width parent giving it
  // shape. Vertical padding (10px) is unchanged from the original.
  officialMsgBtn: { padding: "10px 16px", background: "transparent", border: "1px solid #f59e0b66", borderRadius: 24, color: "#f59e0b", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" },
  messageArea: { flex: 1, overflowY: "auto", padding: "16px 12px 8px", display: "flex", flexDirection: "column", gap: 4, background: "#0f172a" },
  emptyState: { textAlign: "center", color: "#64748b", fontSize: 14, marginTop: 40, fontWeight: 600 },
  separator: { textAlign: "center", color: "#64748b", fontSize: 12, fontWeight: 700, margin: "12px 0 8px", letterSpacing: 0.3 },
  msgRow: { display: "flex", alignItems: "flex-end", gap: 7, marginBottom: 4 },
  msgAvatar: { width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #334155", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" },
  bubble: { maxWidth: "72%", padding: "10px 14px", borderRadius: 20, display: "flex", flexDirection: "column", gap: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" },
  bubbleMine: { background: "linear-gradient(135deg, #e91e63, #c2185b)", borderBottomRightRadius: 5, alignSelf: "flex-end" },
  bubbleTheirs: { background: "#1e293b", border: '1px solid #334155', borderBottomLeftRadius: 5, alignSelf: "flex-start" },
  bubbleText: { margin: 0, fontSize: 15, lineHeight: 1.45, fontWeight: 600, wordBreak: "break-word" },
  bubbleTime: { fontSize: 10, alignSelf: "flex-end", fontWeight: 700 },
  emojiPickerWrap: { position: "absolute", bottom: 80, left: 8, zIndex: 50 },
  emojiLoading: { width: 340, height: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "#1e293b", border: "1px solid #334155", borderRadius: 16, color: "#64748b", fontSize: 13, fontWeight: 600 },
  gifPickerWrap: { position: "absolute", bottom: 80, left: 44, zIndex: 50 },
  inputBar: { display: "flex", alignItems: "center", gap: 6, padding: "10px 10px 14px", background: "#1e293b", borderTop: "1px solid #334155", boxShadow: "0 -2px 8px rgba(0,0,0,0.3)" },
  iconBtn: { background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "transform 0.1s" },
  gifBtn: { borderRadius: 6, padding: "3px 6px" },
  gifText: { color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: 0.5 },
  inputWrap: { flex: 1, background: "#0f172a", border: '1px solid #334155', borderRadius: 22, padding: "8px 14px", display: "flex", alignItems: "center" },
  textInput: { background: "none", border: "none", outline: "none", resize: "none", width: "100%", fontSize: 15, fontFamily: "'Nunito', sans-serif", fontWeight: 600, color: "#f1f5f9", lineHeight: 1.4, maxHeight: 80 },
  sendBtn: { background: "none", border: "none", cursor: "pointer", padding: "4px 8px", transition: "transform 0.1s", flexShrink: 0 },
  sendText: { fontSize: 15, fontWeight: 800, color: "#e91e63" },
};

// --- Mobile responsive wrapper (v5b-2) ---
export default function RoomChat() {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileRoomChat />;
  return <RoomChatDesktop />;
}