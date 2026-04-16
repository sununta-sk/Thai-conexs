// src/pages/RoomChat.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY;

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

// ── GIF Picker Component ────────────────────────────────────
function GifPicker({ onSelect }) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load trending on mount
  useEffect(() => {
    fetchGifs("");
  }, []);

  const fetchGifs = async (q) => {
    setLoading(true);
    try {
      const endpoint = q
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=20&rating=g`;
      const res = await fetch(endpoint);
      const json = await res.json();
      setGifs(json.data || []);
    } catch (e) {
      console.error("Giphy error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.length === 0 || val.length >= 2) fetchGifs(val);
  };

  return (
    <div style={GP.wrap}>
      <input
        autoFocus
        placeholder="Search GIFs..."
        value={query}
        onChange={handleSearch}
        style={GP.input}
      />
      <div style={GP.grid}>
        {loading && <div style={GP.loading}>Loading...</div>}
        {!loading && gifs.map(gif => (
          <img
            key={gif.id}
            src={gif.images.fixed_height_small.url}
            alt={gif.title}
            style={GP.gif}
            onClick={() => onSelect(gif.images.original.url)}
          />
        ))}
      </div>
      <div style={GP.poweredBy}>Powered by GIPHY</div>
    </div>
  );
}

const GP = {
  wrap: { width: 300, background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.15)", overflow: "hidden", display: "flex", flexDirection: "column" },
  input: { margin: 10, padding: "8px 12px", borderRadius: 20, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", background: "#f8fafc" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: "0 10px 8px", maxHeight: 260, overflowY: "auto" },
  gif: { width: "100%", borderRadius: 8, cursor: "pointer", objectFit: "cover", aspectRatio: "1/1" },
  loading: { gridColumn: "1/-1", textAlign: "center", color: "#aaa", fontSize: 13, padding: 20 },
  poweredBy: { textAlign: "center", fontSize: 10, color: "#aaa", padding: "4px 0 8px", fontWeight: 700, letterSpacing: 0.5 },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RoomChat() {
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
  const [reportReason, setReportReason] = useState('');
  const [showTicket, setShowTicket] = useState(false);
  const [ticketMsg, setTicketMsg] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false); // ── NEW

  const submitReport = async () => {
    if (!reportReason || !session) return;
    await supabase.from('content_reports').insert({ reporter_id: session.user.id, reported_user_id: otherUserId, report_type: reportReason, status: 'open' });
    setShowReport(false); setReportReason(''); alert('ส่ง Report เรียบร้อยแล้ว');
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
  const gifPickerRef = useRef(null); // ── NEW
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const audioChunks = useRef([]);

  useEffect(() => {
    if (!showEmoji) return;
    const h = (e) => { if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) setShowEmoji(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showEmoji]);

  // ── Close GIF picker on outside click ── NEW
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

  const otherUserId = session ? chatId.split("_").find((id) => id !== session.user.id) : null;

  useEffect(() => {
    if (!otherUserId) return;
    supabase.from("profiles").select("id, username, avatar_url, photos, details, city, last_seen_at").eq("id", otherUserId).single()
      .then(({ data }) => { if (data) setOtherProfile(data); });
  }, [otherUserId]);

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
          if (payload.new.sender_id !== session.user.id) supabase.from("messages").update({ is_read: true }).eq("id", payload.new.id);
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
    if (error) { console.error("Send error:", error); if (!content_override) setNewMessage(content); }
    setSending(false);
    inputRef.current?.focus();
  }, [newMessage, session, chatId, sending]);

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const handleEmojiSelect = (emoji) => { setNewMessage(prev => prev + emoji.native); setShowEmoji(false); inputRef.current?.focus(); };

  // ── NEW: ส่ง GIF URL เป็น message ──
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

  return (
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
      `}</style>

      {/* HEADER */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate(-1)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div style={{ ...S.headerInfo, cursor: 'pointer' }} onClick={() => otherUserId && navigate(`/profile/${otherUserId}`)}>
          <div style={S.nameGenderRow}>
            <span style={S.headerName}>{otherProfile?.username ?? "User"}</span>
            {profileGender && <span style={S.genderBadge}>{profileGender}</span>}
          </div>
          <div style={S.headerMeta}>{[profileAge, profileCity].filter(Boolean).join(" · ")}</div>
          <div style={S.onlineRow}>
            <div style={{ ...S.onlineDot, background: isOnline ? "#4caf50" : "#ccc" }} />
            <span style={{ ...S.onlineText, color: isOnline ? "#4caf50" : "#aaa" }}>{onlineStatusText}</span>
          </div>
        </div>
        <div style={S.photoStrip} ref={photoScrollRef}>
          {allPhotos.length > 0 ? allPhotos.map((url, i) => (
            <img key={i} src={url} alt="" className="photo-thumb" style={S.photoThumb} onClick={() => otherUserId && navigate(`/profile/${otherUserId}`)} />
          )) : (
            <div style={{ ...S.photoPlaceholder, cursor: 'pointer' }} onClick={() => otherUserId && navigate(`/profile/${otherUserId}`)}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#ccc"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
            </div>
          )}
        </div>
        <div style={{position:'relative'}}>
          <button style={S.moreBtn} onClick={() => setShowMenu(v => !v)}><span style={S.moreDots}>···</span></button>
          {showMenu && (
            <div style={{position:'absolute',right:0,top:'110%',background:'#fff',borderRadius:12,boxShadow:'0 4px 20px rgba(0,0,0,0.15)',zIndex:100,minWidth:160,overflow:'hidden'}}>
              <button onClick={() => { setShowReport(true); setShowMenu(false); }} style={{display:'block',width:'100%',padding:'12px 16px',border:'none',background:'none',textAlign:'left',cursor:'pointer',fontSize:14,color:'#e91e63'}}>🚨 Report User</button>
              <button onClick={() => { setShowTicket(true); setShowMenu(false); }} style={{display:'block',width:'100%',padding:'12px 16px',border:'none',background:'none',textAlign:'left',cursor:'pointer',fontSize:14,color:'#334155'}}>🎫 Support Ticket</button>
            </div>
          )}
        </div>
        {showReport && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={() => setShowReport(false)}>
            <div style={{background:'#fff',borderRadius:16,padding:24,width:300}} onClick={e => e.stopPropagation()}>
              <div style={{fontWeight:700,marginBottom:12}}>Report User</div>
              {['harassment','fake_profile','inappropriate_photo','spam','scam','underage','other'].map(r => (
                <label key={r} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,cursor:'pointer'}}>
                  <input type="radio" name="reason" value={r} onChange={() => setReportReason(r)} />
                  <span style={{fontSize:14,textTransform:'capitalize'}}>{r.replace('_',' ')}</span>
                </label>
              ))}
              <button onClick={submitReport} style={{marginTop:12,width:'100%',padding:'10px',background:'#e91e63',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600}}>Send Report</button>
            </div>
          </div>
        )}
        {showTicket && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={() => setShowTicket(false)}>
            <div style={{background:'#fff',borderRadius:16,padding:24,width:300}} onClick={e => e.stopPropagation()}>
              <div style={{fontWeight:700,marginBottom:12}}>Support Ticket</div>
              <textarea value={ticketMsg} onChange={e => setTicketMsg(e.target.value)} placeholder="อธิบายปัญหา..." style={{width:'100%',height:100,borderRadius:8,border:'1px solid #e2e8f0',padding:8,fontSize:14,resize:'none'}} />
              <button onClick={submitTicket} style={{marginTop:12,width:'100%',padding:'10px',background:'#e91e63',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600}}>Send Ticket</button>
            </div>
          </div>
        )}
      </div>

      {/* MESSAGES */}
      <div style={S.messageArea}>
        {messages.length === 0 && <div style={S.emptyState}>Say hello to {otherProfile?.username ?? "them"} 👋</div>}
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === session?.user?.id;
          const prevMsg = messages[i - 1];
          const showSeparator = !prevMsg || new Date(msg.created_at) - new Date(prevMsg.created_at) > 1000 * 60 * 30;
          // ตรวจว่าเป็น GIF URL ไหม
          const isGif = msg.content?.startsWith("https://media") && msg.content?.includes("giphy.com");
          const isImage = msg.content?.startsWith("https://") && (msg.content?.includes("supabase") || msg.content?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
          const isAudio = msg.content?.includes('supabase') && msg.content?.includes('chat-') && msg.content?.includes('.webm');
          {isGif || isImage ? (
            <img src={msg.content} alt={isGif ? "gif" : "image"} style={{ maxWidth: 220, borderRadius: 12, display: "block", objectFit: "cover" }} />
          ) : isAudio ? (
            <audio controls src={msg.content} style={{ maxWidth: 220, borderRadius: 30 }} />
          ) : (
            <p style={S.bubbleText}>{msg.content}</p>
          )}
          return (
            <div key={msg.id}>
              {showSeparator && <div style={S.separator}>{formatDateSeparator(msg.created_at)}</div>}
              <div style={{ ...S.msgRow, justifyContent: isMine ? "flex-end" : "flex-start" }}>
                {!isMine && <img src={otherProfile?.avatar_url ?? ""} alt="" style={S.msgAvatar} onError={(e) => { e.target.style.display = "none"; }} />}
                <div className="msg-bubble" style={{ ...S.bubble, ...(isMine ? S.bubbleMine : S.bubbleTheirs), ...(isGif ? { background: 'transparent', boxShadow: 'none', padding: 0 } : {}) }}>
                  {isGif ? (
                    <img src={msg.content} alt="gif" style={{ maxWidth: 200, borderRadius: 12, display: 'block' }} />
                  ) : isImage ? (
                    <img src={msg.content} alt="image" style={{ maxWidth: 220, borderRadius: 12, display: 'block' }} />
                  ) : isAudio ? (
                    <audio controls src={msg.content} style={{ maxWidth: 220 }} />
                  ) : (
                    <p style={S.bubbleText}>{msg.content}</p>
                  )}
                  <span style={{ ...S.bubbleTime, color: isMine ? "rgba(255,255,255,0.65)" : "#aaa", ...(isGif ? { paddingLeft: 4 } : {}) }}>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {/* EMOJI PICKER */}
      {showEmoji && (
        <div ref={emojiPickerRef} style={S.emojiPickerWrap}>
          <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="light" previewPosition="none" skinTonePosition="none" maxFrequentRows={2} />
        </div>
      )}

      {/* GIF PICKER — NEW */}
      {showGif && (
        <div ref={gifPickerRef} style={S.gifPickerWrap}>
          <GifPicker onSelect={handleGifSelect} />
        </div>
      )}

      {/* INPUT BAR */}
      <div style={S.inputBar}>
        <button className="icon-btn" style={{ ...S.iconBtn, background: showEmoji ? '#fce4ec' : 'none', borderRadius: 8 }} onClick={() => { setShowEmoji(v => !v); setShowGif(false); }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5b9bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </button>

        {/* GIF — NOW WORKS */}
        <button className="icon-btn" style={{ ...S.iconBtn, ...S.gifBtn, background: showGif ? '#3a7bbf' : '#5b9bd5' }} onClick={() => { setShowGif(v => !v); setShowEmoji(false); }}>
          <span style={S.gifText}>GIF</span>
        </button>

        <button className="icon-btn" style={S.iconBtn} title="Photo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5b9bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          <button className="icon-btn" style={{...S.iconBtn, background: recording ? '#fce4ec' : 'none', borderRadius: 8}} title="Voice" onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={recording ? "#e91e63" : "#5b9bd5"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
}

const S = {
  page: { display: "flex", flexDirection: "column", height: "100dvh", background: "#eef2f7", fontFamily: "'Nunito', sans-serif", overflow: "hidden", position: "relative" },
  loadingScreen: { display: "flex", justifyContent: "center", alignItems: "center", height: "100dvh", gap: 8, background: "#eef2f7" },
  loadingDot: { width: 10, height: 10, borderRadius: "50%", background: "#c9a4d4", animation: "bounce 1.2s ease-in-out infinite" },
  header: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px 10px 8px", background: "#fff", borderBottom: "1px solid #e8ecf0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", minHeight: 72, position: "relative", zIndex: 10 },
  backBtn: { background: "none", border: "none", cursor: "pointer", color: "#5b9bd5", padding: "4px 2px", display: "flex", alignItems: "center", flexShrink: 0 },
  headerInfo: { display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flexShrink: 0 },
  nameGenderRow: { display: "flex", alignItems: "center", gap: 6 },
  headerName: { fontSize: 16, fontWeight: 800, color: "#1a1a2e", whiteSpace: "nowrap" },
  genderBadge: { fontSize: 11, fontWeight: 700, color: "#e91e63", background: "#fce4ec", borderRadius: 99, padding: "1px 8px", whiteSpace: "nowrap" },
  headerMeta: { fontSize: 12, color: "#666", fontWeight: 600 },
  onlineRow: { display: "flex", alignItems: "center", gap: 4, marginTop: 1 },
  onlineDot: { width: 7, height: 7, borderRadius: "50%" },
  onlineText: { fontSize: 12, fontWeight: 700 },
  photoStrip: { display: "flex", gap: 6, overflowX: "auto", flex: 1, alignItems: "center", padding: "0 4px", scrollbarWidth: "none" },
  photoThumb: { width: 52, height: 52, borderRadius: 10, objectFit: "cover", border: "2px solid #e8ecf0", flexShrink: 0 },
  photoPlaceholder: { width: 52, height: 52, borderRadius: 10, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  moreBtn: { background: "none", border: "none", cursor: "pointer", padding: "4px 6px", flexShrink: 0 },
  moreDots: { fontSize: 22, color: "#999", letterSpacing: 1, fontWeight: 900 },
  messageArea: { flex: 1, overflowY: "auto", padding: "16px 12px 8px", display: "flex", flexDirection: "column", gap: 4 },
  emptyState: { textAlign: "center", color: "#aaa", fontSize: 14, marginTop: 40, fontWeight: 600 },
  separator: { textAlign: "center", color: "#aaa", fontSize: 12, fontWeight: 700, margin: "12px 0 8px", letterSpacing: 0.3 },
  msgRow: { display: "flex", alignItems: "flex-end", gap: 7, marginBottom: 4 },
  msgAvatar: { width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" },
  bubble: { maxWidth: "72%", padding: "10px 14px", borderRadius: 20, display: "flex", flexDirection: "column", gap: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  bubbleMine: { background: "linear-gradient(135deg, #e8b4f0 0%, #d4a0e8 100%)", borderBottomRightRadius: 5, alignSelf: "flex-end" },
  bubbleTheirs: { background: "#fff", borderBottomLeftRadius: 5, alignSelf: "flex-start" },
  bubbleText: { margin: 0, fontSize: 15, lineHeight: 1.45, color: "#1a1a2e", fontWeight: 600, wordBreak: "break-word" },
  bubbleTime: { fontSize: 10, alignSelf: "flex-end", fontWeight: 700 },
  emojiPickerWrap: { position: "absolute", bottom: 80, left: 8, zIndex: 50 },
  gifPickerWrap: { position: "absolute", bottom: 80, left: 44, zIndex: 50 }, // ── NEW
  inputBar: { display: "flex", alignItems: "center", gap: 6, padding: "10px 10px 14px", background: "#fff", borderTop: "1px solid #e8ecf0", boxShadow: "0 -2px 8px rgba(0,0,0,0.04)" },
  iconBtn: { background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "transform 0.1s" },
  gifBtn: { borderRadius: 6, padding: "3px 6px" },
  gifText: { color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: 0.5 },
  inputWrap: { flex: 1, background: "#f2f4f7", borderRadius: 22, padding: "8px 14px", display: "flex", alignItems: "center" },
  textInput: { background: "none", border: "none", outline: "none", resize: "none", width: "100%", fontSize: 15, fontFamily: "'Nunito', sans-serif", fontWeight: 600, color: "#1a1a2e", lineHeight: 1.4, maxHeight: 80 },
  sendBtn: { background: "none", border: "none", cursor: "pointer", padding: "4px 8px", transition: "transform 0.1s", flexShrink: 0 },
  sendText: { fontSize: 15, fontWeight: 800, color: "#5b9bd5" },
};