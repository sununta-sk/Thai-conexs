// src/components/MobileRoomChat.jsx — ThaiFriendly-style mobile chat (v5b-2)
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { optimizeImage } from "../lib/imageUtils";

// ── Audio (same pattern as RoomChat desktop) ──
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}
if (typeof window !== "undefined") {
  const unlock = () => {
    getAudioCtx();
    document.removeEventListener("click", unlock);
    document.removeEventListener("touchstart", unlock);
  };
  document.addEventListener("click", unlock);
  document.addEventListener("touchstart", unlock);
}
function playSound(type) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === "send") {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "receive") {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {}
}

// ── Helpers (mirrored from RoomChat) ──
const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY;

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDateSeparator(iso) {
  const d = new Date(iso), now = new Date();
  const diff = Math.floor((now - d) / 1000 / 60 / 60);
  if (diff < 1) return "Just now";
  if (diff < 24) return `${diff} hour${diff > 1 ? "s" : ""} ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
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

// ── GIF Picker (mobile-width variant) ──
function GifPicker({ onSelect }) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchGifs(""); }, []);

  const fetchGifs = async (q) => {
    setLoading(true);
    try {
      const endpoint = q
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=18&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=18&rating=g`;
      const res = await fetch(endpoint);
      const json = await res.json();
      setGifs(json.data || []);
    } catch (e) { console.error("Giphy error:", e); } finally { setLoading(false); }
  };

  return (
    <div style={GP.wrap}>
      <input
        autoFocus
        placeholder="Search GIFs…"
        value={query}
        onChange={e => { setQuery(e.target.value); if (e.target.value.length === 0 || e.target.value.length >= 2) fetchGifs(e.target.value); }}
        style={GP.input}
      />
      <div style={GP.grid}>
        {loading && <div style={GP.loading}>Loading…</div>}
        {!loading && gifs.map(gif => (
          <img key={gif.id} src={gif.images.fixed_height_small.url} alt={gif.title} style={GP.gif}
            onClick={() => onSelect(gif.images.original.url)} />
        ))}
      </div>
      <div style={GP.poweredBy}>Powered by GIPHY</div>
    </div>
  );
}
const GP = {
  wrap: { width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: "16px 16px 0 0", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: 280 },
  input: { margin: 10, padding: "8px 12px", borderRadius: 20, border: "1px solid #334155", fontSize: 14, outline: "none", background: "#0f172a", color: "#f1f5f9", width: "calc(100% - 20px)" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, padding: "0 10px 8px", maxHeight: 200, overflowY: "auto" },
  gif: { width: "100%", borderRadius: 8, cursor: "pointer", objectFit: "cover", aspectRatio: "1/1" },
  loading: { gridColumn: "1/-1", textAlign: "center", color: "#64748b", fontSize: 13, padding: 20 },
  poweredBy: { textAlign: "center", fontSize: 10, color: "#64748b", padding: "4px 0 8px", fontWeight: 700 },
};

const menuItemStyle = (variant) => ({
  display: "block", width: "100%", padding: "12px 16px", border: "none", background: "none",
  textAlign: "left", cursor: "pointer", fontSize: 14,
  color: variant === "pink" ? "#e91e63" : "#cbd5e1",
});

// ── Component ──
export default function MobileRoomChat() {
  const { chatId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [otherProfile, setOtherProfile] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showTicket, setShowTicket] = useState(false);
  const [ticketMsg, setTicketMsg] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const emojiRef = useRef(null);
  const gifRef = useRef(null);
  const menuRef = useRef(null);
  const audioChunks = useRef([]);

  // Outside-click dismissal
  useEffect(() => {
    if (!showEmoji) return;
    const h = (e) => { if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false); };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, [showEmoji]);

  useEffect(() => {
    if (!showGif) return;
    const h = (e) => { if (gifRef.current && !gifRef.current.contains(e.target)) setShowGif(false); };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, [showGif]);

  useEffect(() => {
    if (!showMenu) return;
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, [showMenu]);

  // Auth — identical to RoomChat
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) setSession(data.session); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_OUT") navigate("/login"); else if (s) setSession(s);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Derive other user id — same logic as RoomChat
  const otherUserId = session ? chatId.split("_").find((id) => id !== session.user.id) : null;

  // Other user profile + profile view — identical to RoomChat
  useEffect(() => {
    if (!otherUserId || !session) return;
    supabase.from("profiles")
      .select("id, username, avatar_url, photos, details, city, last_seen_at, is_verified, bio")
      .eq("id", otherUserId).single()
      .then(({ data }) => { if (data) setOtherProfile(data); });
    supabase.from("profile_views").insert({ viewer_id: session.user.id, viewed_id: otherUserId })
      .then(({ error }) => { if (error) console.error("[ProfileView from chat]", error); });
  }, [otherUserId, session]);

  // Presence channel — identical to RoomChat
  useEffect(() => {
    if (!session || !otherUserId) return;
    const ch = supabase.channel(`presence:${chatId}`, { config: { presence: { key: session.user.id } } });
    ch.on("presence", { event: "sync" }, () => { setIsOnline(!!ch.presenceState()[otherUserId]); })
      .subscribe(async (s) => { if (s === "SUBSCRIBED") await ch.track({ online_at: new Date().toISOString() }); });
    return () => { supabase.removeChannel(ch); };
  }, [session, otherUserId, chatId]);

  // Messages fetch + realtime + polling — identical to RoomChat
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

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // sendMessage — identical to RoomChat
  const sendMessage = useCallback(async (content_override) => {
    const content = (content_override || newMessage).trim();
    if (!content || !session || sending) return;
    setSending(true);
    const tempMsg = { id: "temp-" + Date.now(), chat_id: chatId, room_id: chatId, sender_id: session.user.id, content, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    if (!content_override) setNewMessage("");
    const { error } = await supabase.from("messages").insert({ chat_id: chatId, room_id: chatId, sender_id: session.user.id, content });
    if (!error) playSound("send");
    if (error) { console.error("Send error:", error); if (!content_override) setNewMessage(content); }
    setSending(false);
    inputRef.current?.focus();
  }, [newMessage, session, chatId, sending]);

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const handleEmojiSelect = (emoji) => { setNewMessage(prev => prev + emoji.native); setShowEmoji(false); inputRef.current?.focus(); };
  const handleGifSelect = (gifUrl) => { setShowGif(false); sendMessage(gifUrl); };

  // Voice recording — identical to RoomChat
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunks.current = [];
      recorder.ondataavailable = (e) => audioChunks.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        const path = `chat/${session.user.id}/${Date.now()}.webm`;
        const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "audio/webm" });
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
          await sendMessage(publicUrl);
        }
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (e) { console.error("Mic error:", e); }
  };
  const stopRecording = () => {
    if (mediaRecorder) { mediaRecorder.stop(); setRecording(false); setMediaRecorder(null); }
  };

  // Report / Ticket — identical to RoomChat
  const submitReport = async () => {
    if (!reportReason || !session) return;
    await supabase.from("content_reports").insert({ reporter_id: session.user.id, reported_user_id: otherUserId, report_type: reportReason, status: "open" });
    setShowReport(false); setReportReason(""); alert("ส่ง Report เรียบร้อยแล้ว");
  };
  const submitTicket = async () => {
    if (!ticketMsg || !session) return;
    await supabase.from("support_tickets").insert({ user_id: session.user.id, subject: "Chat issue", message: ticketMsg, status: "open", priority: "medium" });
    setShowTicket(false); setTicketMsg(""); alert("ส่ง Ticket เรียบร้อยแล้ว");
  };

  // Derived display values
  const profileCity = otherProfile?.city ?? otherProfile?.details?.city ?? "";
  const rawPhotos = Array.isArray(otherProfile?.photos) ? otherProfile.photos : [];
  const photoUrls = rawPhotos.map(extractPhotoUrl).filter(Boolean);
  const allPhotos = [...(otherProfile?.avatar_url ? [otherProfile.avatar_url] : []), ...photoUrls.filter(u => u !== otherProfile?.avatar_url)];
  const avatarUrl = allPhotos[0] || null;
  const onlineStatusText = isOnline ? "Online" : timeAgo(otherProfile?.last_seen_at);

  if (loading) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.dot} />
        <div style={{ ...S.dot, animationDelay: "0.15s" }} />
        <div style={{ ...S.dot, animationDelay: "0.3s" }} />
        <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-8px);opacity:1} }`}</style>
      </div>
    );
  }

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-8px);opacity:1} }
        .mc-bubble { animation: fadeUp 0.18s ease; }
        .mc-send:active { transform: scale(0.92); }
        .mc-icon:active { transform: scale(0.88); }
        textarea::placeholder { color: #64748b; }
      `}</style>

      {/* ── Header ── */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate(-1)}>←</button>

        <div style={S.avatarWrap} onClick={() => otherUserId && navigate(`/profile/${otherUserId}`)}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={S.avatar} onError={(e) => { e.target.style.display = 'none'; }} />
            : <div style={S.avatarFallback}>{(otherProfile?.username?.[0] ?? "?").toUpperCase()}</div>}
          <div style={{ ...S.presenceDot, background: isOnline ? "#4caf50" : "#64748b" }} />
        </div>

        <div style={S.headerInfo} onClick={() => otherUserId && navigate(`/profile/${otherUserId}`)}>
          <div style={S.headerName}>{otherProfile?.username ?? "User"}</div>
          <div style={S.headerSub}>
            {profileCity ? <span>📍 {profileCity} · </span> : null}
            <span style={{ color: isOnline ? "#4caf50" : "#94a3b8" }}>{onlineStatusText}</span>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div ref={menuRef} style={{ position: "relative" }}>
          <button style={S.menuBtn} onClick={() => setShowMenu(v => !v)}>⋯</button>
          {showMenu && (
            <div style={S.menuDropdown}>
              <button onClick={() => { setShowReport(true); setShowMenu(false); }} style={menuItemStyle("pink")}>🚨 Report User</button>
              <button onClick={() => { setShowTicket(true); setShowMenu(false); }} style={menuItemStyle("default")}>🎫 Support Ticket</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Message Area ── */}
      <div style={S.messageArea}>
        {messages.length === 0 && (
          <div style={S.emptyState}>Say hello to {otherProfile?.username ?? "them"} 👋</div>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === session?.user?.id;
          const prevMsg = messages[i - 1];
          const showSep = !prevMsg || new Date(msg.created_at) - new Date(prevMsg.created_at) > 1000 * 60 * 30;
          const isGif = msg.content?.startsWith("https://media") && msg.content?.includes("giphy.com");
          const isAudio = msg.content?.includes("supabase") && msg.content?.includes("chat-") && msg.content?.includes(".webm");
          const isImage = !isGif && !isAudio && msg.content?.startsWith("https://") && (msg.content?.includes("supabase") || msg.content?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
          return (
            <div key={msg.id}>
              {showSep && <div style={S.separator}>{formatDateSeparator(msg.created_at)}</div>}
              <div style={{ ...S.msgRow, justifyContent: isMine ? "flex-end" : "flex-start" }}>
                {!isMine && (
                  <img src={otherProfile?.avatar_url ?? ""} alt="" style={S.msgAvatar} onError={(e) => { e.target.style.display = 'none'; }}
                    onError={e => { e.target.style.display = "none"; }} />
                )}
                <div className="mc-bubble" style={{
                  ...S.bubble,
                  ...(isMine ? S.bubbleMine : S.bubbleTheirs),
                  ...(isGif ? S.bubbleGif : {}),
                }}>
                  {isGif ? (
                    <img src={msg.content} alt="gif" style={{ maxWidth: 180, borderRadius: 12, display: "block" }} />
                  ) : isImage ? (
                    <img src={msg.content} alt="img" style={{ maxWidth: 200, borderRadius: 12, display: "block" }} />
                  ) : isAudio ? (
                    <audio controls src={msg.content} style={{ maxWidth: 200 }} />
                  ) : (
                    <p style={{ ...S.bubbleText, color: isMine ? "#fff" : "#f1f5f9" }}>{msg.content}</p>
                  )}
                  <span style={{ ...S.bubbleTime, color: isMine ? "rgba(255,255,255,0.65)" : "#64748b", ...(isGif ? { paddingLeft: 4 } : {}) }}>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {/* ── Emoji Picker ── */}
      {showEmoji && (
        <div ref={emojiRef} style={S.emojiWrap}>
          <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="dark" previewPosition="none" skinTonePosition="none" maxFrequentRows={2} />
        </div>
      )}

      {/* ── GIF Picker (full-width on mobile) ── */}
      {showGif && (
        <div ref={gifRef} style={S.gifWrap}>
          <GifPicker onSelect={handleGifSelect} />
        </div>
      )}

      {/* ── Input Bar ── */}
      <div style={S.inputBar}>
        <button
          className="mc-icon"
          style={{ ...S.iconBtn, background: showEmoji ? "rgba(233,30,99,0.15)" : "none" }}
          onClick={() => { setShowEmoji(v => !v); setShowGif(false); }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e91e63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </button>

        <button
          className="mc-icon"
          style={{ ...S.iconBtn, borderRadius: 6, padding: "3px 6px", background: showGif ? "#c2185b" : "#e91e63" }}
          onClick={() => { setShowGif(v => !v); setShowEmoji(false); }}
        >
          <span style={{ color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>GIF</span>
        </button>

        <div style={S.inputWrap}>
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            style={S.textInput}
          />
        </div>

        {newMessage.trim() ? (
          <button className="mc-send" style={S.sendBtn} onClick={() => sendMessage()} disabled={sending}>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#e91e63" }}>Send</span>
          </button>
        ) : (
          <button
            className="mc-icon"
            style={{ ...S.iconBtn, background: recording ? "rgba(233,30,99,0.15)" : "none" }}
            onMouseDown={startRecording} onMouseUp={stopRecording}
            onTouchStart={startRecording} onTouchEnd={stopRecording}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={recording ? "#f87171" : "#e91e63"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Report Modal ── */}
      {showReport && (
        <div style={S.modalOverlay} onClick={() => setShowReport(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>Report User</div>
            {["harassment", "fake_profile", "inappropriate_photo", "spam", "scam", "underage", "other"].map(r => (
              <label key={r} style={S.radioRow}>
                <input type="radio" name="report_reason_mobile" value={r} onChange={() => setReportReason(r)} />
                <span style={S.radioLabel}>{r.replace(/_/g, " ")}</span>
              </label>
            ))}
            <button onClick={submitReport} style={S.submitBtn}>Send Report</button>
          </div>
        </div>
      )}

      {/* ── Ticket Modal ── */}
      {showTicket && (
        <div style={S.modalOverlay} onClick={() => setShowTicket(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>Support Ticket</div>
            <textarea
              value={ticketMsg}
              onChange={e => setTicketMsg(e.target.value)}
              placeholder="อธิบายปัญหา…"
              style={{ width: "100%", height: 100, borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", padding: 8, fontSize: 14, resize: "none" }}
            />
            <button onClick={submitTicket} style={S.submitBtn}>Send Ticket</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ──
const S = {
  root: { display: "flex", flexDirection: "column", height: "100dvh", minHeight: "100dvh", background: "#0f172a", fontFamily: "'Nunito', sans-serif", overflow: "hidden", position: "fixed", top: 0, left: 0, right: 0 },
  loadingWrap: { display: "flex", justifyContent: "center", alignItems: "center", height: "100dvh", minHeight: "100dvh", background: "#0f172a", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: "50%", background: "#e91e63", animation: "bounce 1.2s ease-in-out infinite" },

  // Header — sticky top, 64px, #0f172a bg, border-bottom
  header: { display: "flex", alignItems: "center", gap: 10, padding: "0 12px 0 8px", background: "#0f172a", borderBottom: "1px solid #334155", height: 64, flexShrink: 0, position: "relative", zIndex: 20 },
  backBtn: { background: "none", border: "none", cursor: "pointer", color: "#e91e63", fontSize: 22, padding: "4px 6px", flexShrink: 0, display: "flex", alignItems: "center", lineHeight: 1 },
  avatarWrap: { position: "relative", cursor: "pointer", flexShrink: 0 },
  avatar: { width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #334155", display: "block" },
  avatarFallback: { width: 36, height: 36, borderRadius: "50%", background: "#1e293b", border: "2px solid #334155", display: "flex", alignItems: "center", justifyContent: "center", color: "#e91e63", fontWeight: 800, fontSize: 15 },
  presenceDot: { position: "absolute", bottom: 1, right: 1, width: 9, height: 9, borderRadius: "50%", border: "2px solid #0f172a" },
  headerInfo: { display: "flex", flexDirection: "column", gap: 1, cursor: "pointer", minWidth: 0, flex: 1 },
  headerName: { fontSize: 15, fontWeight: 800, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  headerSub: { fontSize: 11, color: "#94a3b8", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  menuBtn: { background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 22, padding: "4px 6px", letterSpacing: 1, fontWeight: 900, lineHeight: 1, flexShrink: 0 },
  menuDropdown: { position: "absolute", right: 0, top: "110%", background: "#1e293b", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", zIndex: 100, minWidth: 160, overflow: "hidden", border: "1px solid #334155" },

  // Messages
  messageArea: { flex: 1, overflowY: "auto", padding: "12px 12px 8px", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 4, background: "#0f172a" },
  emptyState: { textAlign: "center", color: "#64748b", fontSize: 14, marginTop: 40, fontWeight: 600 },
  separator: { textAlign: "center", color: "#64748b", fontSize: 11, fontWeight: 700, margin: "12px 0 8px", letterSpacing: 0.3 },
  msgRow: { display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 2 },
  msgAvatar: { width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #334155" },

  // Bubbles — other: #1e293b rounded 18px sharper bottom-left; mine: pink gradient sharper bottom-right
  bubble: { maxWidth: "75%", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" },
  bubbleMine: { background: "linear-gradient(135deg, #e91e63, #c2185b)", borderRadius: 18, borderBottomRightRadius: 4, alignSelf: "flex-end" },
  bubbleTheirs: { background: "#1e293b", border: "1px solid #334155", borderRadius: 18, borderBottomLeftRadius: 4, alignSelf: "flex-start" },
  bubbleGif: { background: "transparent", boxShadow: "none", padding: 0, border: "none" },
  bubbleText: { margin: 0, fontSize: 15, lineHeight: 1.45, fontWeight: 600, wordBreak: "break-word" },
  bubbleTime: { fontSize: 10, alignSelf: "flex-end", fontWeight: 700 },

  // Pickers
  emojiWrap: { position: "absolute", bottom: 70, left: 8, zIndex: 50 },
  gifWrap: { position: "absolute", bottom: 70, left: 8, right: 8, zIndex: 50 },

  // Input bar — #0f172a bg, border-top
  inputBar: { display: "flex", alignItems: "center", gap: 6, padding: "10px 10px 14px", background: "#0f172a", borderTop: "1px solid #334155", flexShrink: 0 },
  iconBtn: { background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "transform 0.1s", borderRadius: 8 },
  inputWrap: { flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 22, padding: "8px 14px", display: "flex", alignItems: "center" },
  textInput: { background: "none", border: "none", outline: "none", resize: "none", width: "100%", fontSize: 15, fontFamily: "'Nunito', sans-serif", fontWeight: 600, color: "#f1f5f9", lineHeight: 1.4, maxHeight: 80 },
  sendBtn: { background: "none", border: "none", cursor: "pointer", padding: "4px 8px", transition: "transform 0.1s", flexShrink: 0 },

  // Modals
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: 24, width: 300, maxWidth: "90vw" },
  modalTitle: { fontWeight: 700, marginBottom: 12, color: "#f1f5f9", fontSize: 16 },
  radioRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" },
  radioLabel: { fontSize: 14, color: "#cbd5e1", textTransform: "capitalize" },
  submitBtn: { marginTop: 12, width: "100%", padding: 10, background: "#e91e63", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 15 },
};
