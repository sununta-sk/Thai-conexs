// src/pages/RoomChat.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useIsMobile } from "../hooks/useIsMobile";
import MobileRoomChat from "../components/MobileRoomChat";

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

function useIsDesktop(breakpoint = 900) {
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= breakpoint : false);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isDesktop;
}

function SidebarPhotoCarousel({ photos, isSubscriber, onUpgrade }) {
  const [current, setCurrent] = useState(0);
  if (!photos || photos.length === 0) {
    return <div style={SC.noPhoto}>No photos</div>;
  }
  const prev = () => setCurrent(i => (i - 1 + photos.length) % photos.length);
  const next = () => setCurrent(i => (i + 1) % photos.length);
  const isLocked = !isSubscriber && current >= FREE_LIMIT;

  return (
    <div style={SC.wrap}>
      <img
        key={current}
        src={photos[current]}
        alt={`photo-${current}`}
        style={{ ...SC.img, filter: isLocked ? 'blur(18px)' : 'none', transform: isLocked ? 'scale(1.1)' : 'scale(1)' }}
      />

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

      {photos.length > 1 && (
        <>
          <button style={{ ...SC.arrow, left: 8 }} onClick={prev}>‹</button>
          <button style={{ ...SC.arrow, right: 8 }} onClick={next}>›</button>
          <div style={SC.counter}>{current + 1} / {photos.length}</div>
          <div style={SC.dots}>
            {photos.map((_, i) => (
              <div key={i} style={{ ...SC.dot, background: i === current ? '#e91e63' : 'rgba(255,255,255,0.6)' }} onClick={() => setCurrent(i)} />
            ))}
          </div>
        </>
      )}

      {!isSubscriber && photos.length > FREE_LIMIT && (
        <div style={SC.freeBadge}>🔓 {Math.min(current + 1, FREE_LIMIT)}/{FREE_LIMIT} free</div>
      )}
    </div>
  );
}

const SC = {
  wrap: { position: 'relative', width: '100%', aspectRatio: '3/4', borderRadius: 16, overflow: 'hidden', background: '#0f172a', marginBottom: 8, border: '1px solid #334155' },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'filter 0.3s, transform 0.3s' },
  noPhoto: { width: '100%', aspectRatio: '3/4', borderRadius: 16, background: '#0f172a', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 13, marginBottom: 8 },
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

function DesktopSidebar({ profile, allPhotos, isOnline, onlineStatusText, isSubscriber, onUpgrade, onBlock }) {
  const d = profile?.details || {};
  const age = d.age || '';
  const gender = d.gender || '';
  const height = d.height || '';
  const weight = d.weight || '';
  const education = d.education || '';
  const lookingFor = d.lookingFor || '';
  const city = profile?.city || d.city || '';
  const bio = profile?.bio || profile?.about_me || '';

  return (
    <div style={DS.wrap}>
      <div style={DS.inner}>
        <SidebarPhotoCarousel photos={allPhotos} isSubscriber={isSubscriber} onUpgrade={onUpgrade} />

        <div style={DS.nameRow}>
          <span style={DS.name}>{profile?.username ?? 'User'}</span>
          {profile?.is_verified && <span style={DS.verified}>✓ Verified</span>}
        </div>

        <div style={DS.statusRow}>
          <div style={{ ...DS.statusDot, background: isOnline ? '#4caf50' : '#64748b' }} />
          <span style={{ ...DS.statusText, color: isOnline ? '#4caf50' : '#94a3b8' }}>{onlineStatusText}</span>
        </div>

        {city && <div style={DS.city}>📍 {city}</div>}

        {bio && (
          <>
            <div style={DS.sectionTitle}>ABOUT ME</div>
            <div style={DS.bioText}>{bio}</div>
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

        <button style={DS.blockBtn} onClick={onBlock}>🚫 Block User</button>
      </div>
    </div>
  );
}

const DS = {
  wrap: { width: 360, flexShrink: 0, background: '#1e293b', borderRight: '1px solid #334155', overflowY: 'auto', display: 'flex', justifyContent: 'center' },
  inner: { width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '80px 20px 28px', gap: 10 },
  nameRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  name: { fontSize: 22, fontWeight: 800, color: '#f1f5f9' },
  verified: { fontSize: 11, fontWeight: 700, color: '#fff', background: '#e91e63', borderRadius: 99, padding: '3px 9px' },
  statusRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: '50%' },
  statusText: { fontSize: 13, fontWeight: 700 },
  city: { fontSize: 13, color: '#94a3b8', fontWeight: 600 },
  sectionTitle: { fontSize: 11, fontWeight: 800, color: '#e91e63', letterSpacing: 0.6, marginTop: 14, alignSelf: 'flex-start' },
  bioText: { fontSize: 14, color: '#cbd5e1', lineHeight: 1.5, fontWeight: 500, alignSelf: 'flex-start', textAlign: 'left' },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  chip: { fontSize: 12, fontWeight: 600, background: 'rgba(233, 30, 99, 0.15)', border: '1px solid rgba(233, 30, 99, 0.3)', color: '#e91e63', padding: '5px 10px', borderRadius: 99 },
  blockBtn: { marginTop: 20, width: '100%', padding: '10px 0', background: 'transparent', border: '1px solid #ef444466', borderRadius: 24, color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
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
  const isDesktop = useIsDesktop(900);

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [otherProfile, setOtherProfile] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showTicket, setShowTicket] = useState(false);
  const [ticketMsg, setTicketMsg] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [isSubscriber, setIsSubscriber] = useState(false);

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
    setShowTicket(false); setTicketMsg(''); alert('ส่ง Ticket เรียบร้อยแล้ว');
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

  const otherUserId = session ? chatId.split("_").find((id) => id !== session.user.id) : null;

  useEffect(() => {
    if (!otherUserId || !session) return;
    supabase.from("profiles").select("id, username, avatar_url, photos, details, city, last_seen_at, is_verified, bio").eq("id", otherUserId).single()
      .then(({ data }) => { if (data) setOtherProfile(data); });
    // Track profile view when opening chat (so the other user gets a toast notification)
    supabase.from('profile_views').insert({
      viewer_id: session.user.id,
      viewed_id: otherUserId,
    }).then(({ error }) => {
      if (error) console.error('[ProfileView from chat] ERROR:', error);
    });
  }, [otherUserId, session]);

  useEffect(() => {
    if (!session || !otherUserId) return;
    const ch = supabase.channel(`presence:${chatId}`, { config: { presence: { key: session.user.id } } });
    ch.on("presence", { event: "sync" }, () => { setIsOnline(!!ch.presenceState()[otherUserId]); })
      .subscribe(async (s) => { if (s === "SUBSCRIBED") await ch.track({ online_at: new Date().toISOString() }); });
    return () => { supabase.removeChannel(ch); };
  }, [session, otherUserId, chatId]);

  useEffect(() => {
    if (!session || !chatId) return;
    const fetch_ = async () => {
      const { data, error } = await supabase.from("messages").select("*").eq("chat_id", chatId).order("created_at", { ascending: true }).range(0, 99);
      if (!error) setMessages(data || []);
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
    const poll = setInterval(async () => {
      const { data } = await supabase.from("messages").select("*").eq("chat_id", chatId).order("created_at", { ascending: true }).range(0, 99);
      if (data) setMessages(data);
    }, 1000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
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
    if (!error) playSound('send');
    if (error) { console.error("Send error:", error); if (!content_override) setNewMessage(content); }
    setSending(false);
    inputRef.current?.focus();
  }, [newMessage, session, chatId, sending]);

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
  const allPhotos = [...(otherProfile?.avatar_url ? [otherProfile.avatar_url] : []), ...photoUrls.filter(u => u !== otherProfile?.avatar_url)];
  const onlineStatusText = isOnline ? "Online" : timeAgo(otherProfile?.last_seen_at);

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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
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
          </div>
          <div style={S.headerMeta}>{[profileAge, profileCity].filter(Boolean).join(" · ")}</div>
          <div style={S.onlineRow}>
            <div style={{ ...S.onlineDot, background: isOnline ? "#4caf50" : "#64748b" }} />
            <span style={{ ...S.onlineText, color: isOnline ? "#4caf50" : "#94a3b8" }}>{onlineStatusText}</span>
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
              <textarea value={ticketMsg} onChange={e => setTicketMsg(e.target.value)} placeholder="อธิบายปัญหา..." style={{width:'100%',height:100,borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',padding:8,fontSize:14,resize:'none'}} />
              <button onClick={submitTicket} style={{marginTop:12,width:'100%',padding:'10px',background:'#e91e63',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600}}>Send Ticket</button>
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
                {!isMine && <img src={otherProfile?.avatar_url ?? ""} alt="" style={S.msgAvatar} onError={(e) => { e.target.style.display = "none"; }} />}
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
          <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="dark" previewPosition="none" skinTonePosition="none" maxFrequentRows={2} />
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
          onlineStatusText={onlineStatusText}
          isSubscriber={isSubscriber}
          onUpgrade={handleUpgrade}
          onBlock={submitBlock}
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
  headerMeta: { fontSize: 12, color: "#94a3b8", fontWeight: 600 },
  onlineRow: { display: "flex", alignItems: "center", gap: 4, marginTop: 1 },
  onlineDot: { width: 7, height: 7, borderRadius: "50%" },
  onlineText: { fontSize: 12, fontWeight: 700 },
  photoStrip: { display: "flex", gap: 6, overflowX: "auto", flex: 1, alignItems: "center", padding: "0 4px", scrollbarWidth: "none" },
  photoThumb: { width: 52, height: 52, borderRadius: 10, objectFit: "cover", border: "2px solid #334155", flexShrink: 0 },
  photoPlaceholder: { width: 52, height: 52, borderRadius: 10, background: "#0f172a", border: '1px solid #334155', display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  moreBtn: { background: "none", border: "none", cursor: "pointer", padding: "4px 6px", flexShrink: 0 },
  moreDots: { fontSize: 22, color: "#94a3b8", letterSpacing: 1, fontWeight: 900 },
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