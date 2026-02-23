// src/pages/RoomChat.jsx
// ThaiFriendly-style chat
// chatId format: "uid1_uid2" (sorted) — from getChatId() in Discover.jsx

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatSeparator(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 60) return `${diff || 1} นาทีที่แล้ว`;
  if (diff < 1440) return `${Math.floor(diff / 60)} ชั่วโมงที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", { month: "short", day: "numeric" });
}

export default function RoomChat() {
  const { chatId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherProfile, setOtherProfile] = useState(null);
  const [isOnline, setIsOnline] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // 1. Get session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate("/login"); return; }
      setSession(data.session);
    });
  }, [navigate]);

  // 2. Parse otherUserId from chatId
  // chatId = "uuid1_uuid2" where each UUID is 36 chars, total length = 73
  const otherUserId = session ? (() => {
    if (chatId && chatId.length === 73) {
      const a = chatId.slice(0, 36);
      const b = chatId.slice(37);
      return a === session.user.id ? b : a;
    }
    // fallback: whole chatId is the other user id (old format)
    return chatId !== session.user.id ? chatId : null;
  })() : null;

  // 3. Fetch other profile
  useEffect(() => {
    if (!otherUserId) return;
    supabase
      .from("profiles")
      .select("id, username, avatar_url, photos, details, bio")
      .eq("id", otherUserId)
      .single()
      .then(({ data }) => { if (data) setOtherProfile(data); });
  }, [otherUserId]);

  // 4. Presence
  useEffect(() => {
    if (!session || !otherUserId) return;
    const ch = supabase.channel(`presence:${chatId}`, {
      config: { presence: { key: session.user.id } },
    });
    ch.on("presence", { event: "sync" }, () => {
      setIsOnline(!!ch.presenceState()[otherUserId]);
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ online_at: new Date().toISOString() });
    });
    return () => { supabase.removeChannel(ch); };
  }, [session, otherUserId, chatId]);

  // 5. Messages + Realtime
  useEffect(() => {
    if (!session || !chatId) return;

    supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .range(0, 99)
      .then(({ data, error }) => {
        if (!error) setMessages(data || []);
        setLoading(false);
      });

    supabase
      .from("messages")
      .update({ is_read: true })
      .eq("chat_id", chatId)
      .neq("sender_id", session.user.id);

    const channel = supabase
      .channel(`room:${chatId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        if (payload.new.sender_id !== session.user.id) {
          supabase.from("messages").update({ is_read: true }).eq("id", payload.new.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, chatId]);

  // 6. Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 7. Send
  const sendMessage = useCallback(async () => {
    const content = newMessage.trim();
    if (!content || !session || sending) return;
    setSending(true);
    setNewMessage("");
    const { error } = await supabase.from("messages").insert({
      chat_id: chatId,
      sender_id: session.user.id,
      content,
    });
    if (error) setNewMessage(content);
    setSending(false);
    inputRef.current?.focus();
  }, [newMessage, session, chatId, sending]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Derived
  const age    = otherProfile?.details?.age ?? "";
  const gender = otherProfile?.details?.gender ?? "";
  const city   = otherProfile?.details?.city ?? "";
  const meta   = [age, gender, city].filter(Boolean).join(" / ");

  const allPhotos = (() => {
    const raw = otherProfile?.avatar_url;
    const mainUrl = raw ? (typeof raw === "string" ? raw : raw.url) : null;
    const extras = (otherProfile?.photos ?? []).map((p) =>
      typeof p === "string" ? p : p.url
    );
    return [...(mainUrl ? [mainUrl] : []), ...extras];
  })();

  if (loading) {
    return (
      <div style={S.loadingScreen}>
        <div style={S.spinner} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:0;height:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .bubble{animation:fadeUp 0.18s ease}
        .send-btn:active{transform:scale(0.93)}
        .icon-btn:active{transform:scale(0.88)}
      `}</style>

      {/* HEADER */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate(-1)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div style={S.headerInfo}>
          <div style={S.headerName}>{otherProfile?.username ?? "User"}</div>
          {meta ? <div style={S.headerMeta}>{meta}</div> : null}
          <div style={S.onlineRow}>
            <div style={{ ...S.onlineDot, background: isOnline ? "#ff9500" : "#ccc" }} />
            <span style={{ ...S.onlineLabel, color: isOnline ? "#ff9500" : "#aaa" }}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        <div style={S.photoStrip}>
          {allPhotos.length > 0 ? allPhotos.map((url, i) => (
            <img key={i} src={url} alt="" style={S.photoThumb}
              onError={(e) => { e.target.style.display = "none"; }} />
          )) : (
            <div style={S.photoPlaceholder}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#ccc">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
          )}
        </div>

        <button style={S.moreBtn}>
          <span style={S.moreDots}>···</span>
        </button>
      </div>

      {/* MESSAGES */}
      <div style={S.messageArea}>
        {messages.length === 0 && (
          <div style={S.emptyChat}>
            เริ่มการสนทนากับ {otherProfile?.username ?? "เขา"} 👋
          </div>
        )}

        {messages.map((msg, i) => {
          const isMine = msg.sender_id === session?.user?.id;
          const prev = messages[i - 1];
          const showSep = !prev ||
            new Date(msg.created_at) - new Date(prev.created_at) > 1800000;

          return (
            <div key={msg.id}>
              {showSep && (
                <div style={S.separator}>{formatSeparator(msg.created_at)}</div>
              )}
              <div style={{ ...S.msgRow, justifyContent: isMine ? "flex-end" : "flex-start" }}>
                {!isMine && (
                  <img src={allPhotos[0] ?? ""} alt="" style={S.msgAvatar}
                    onError={(e) => { e.target.style.visibility = "hidden"; }} />
                )}
                <div className="bubble"
                  style={{ ...S.bubble, ...(isMine ? S.bubbleMine : S.bubbleTheirs) }}>
                  <p style={S.bubbleText}>{msg.content}</p>
                  <span style={{
                    ...S.bubbleTime,
                    color: isMine ? "rgba(80,30,0,0.45)" : "#bbb",
                  }}>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} style={{ height: 8 }} />
      </div>

      {/* INPUT BAR */}
      <div style={S.inputBar}>
        <button className="icon-btn" style={S.iconBtn}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
            stroke="#5b9bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </button>

        <button className="icon-btn" style={S.gifBtn}>
          <span style={S.gifText}>GIF</span>
        </button>

        <button className="icon-btn" style={S.iconBtn}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="#5b9bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </button>

        <div style={S.inputWrap}>
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            rows={1}
            style={S.textInput}
          />
        </div>

        {newMessage.trim() ? (
          <button className="send-btn" style={S.sendWordBtn}
            onClick={sendMessage} disabled={sending}>
            Send
          </button>
        ) : (
          <button className="icon-btn" style={S.iconBtn}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="#5b9bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  page: {
    display: "flex", flexDirection: "column", height: "calc(100dvh - 60px)",
    background: "#eef2f7", fontFamily: "'Nunito', sans-serif", overflow: "hidden",
  },
  loadingScreen: {
    display: "flex", justifyContent: "center", alignItems: "center",
    height: "100dvh", background: "#eef2f7",
  },
  spinner: {
    width: 36, height: 36, borderRadius: "50%",
    border: "3px solid #e8d5f5", borderTopColor: "#c9a4d4",
    animation: "spin 0.8s linear infinite",
  },
  header: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 12px 10px 8px",
    background: "#fff", borderBottom: "1px solid #e8ecf0",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    minHeight: 70, zIndex: 10,
  },
  backBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#5b9bd5", padding: "4px 2px",
    display: "flex", alignItems: "center", flexShrink: 0,
  },
  headerInfo: { display: "flex", flexDirection: "column", gap: 0, flexShrink: 0 },
  headerName: { fontSize: 15, fontWeight: 800, color: "#1a1a2e" },
  headerMeta: { fontSize: 11, color: "#777", fontWeight: 600 },
  onlineRow: { display: "flex", alignItems: "center", gap: 4, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: "50%" },
  onlineLabel: { fontSize: 11, fontWeight: 700 },
  photoStrip: {
    display: "flex", gap: 6, overflowX: "auto", flex: 1,
    alignItems: "center", padding: "0 2px", scrollbarWidth: "none",
  },
  photoThumb: {
    width: 48, height: 48, borderRadius: 9, objectFit: "cover",
    border: "2px solid #e8ecf0", flexShrink: 0,
  },
  photoPlaceholder: {
    width: 48, height: 48, borderRadius: 9, background: "#f0f0f0",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  moreBtn: { background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0 },
  moreDots: { fontSize: 20, color: "#aaa", letterSpacing: 1, fontWeight: 900 },
  messageArea: {
    flex: 1, overflowY: "auto", padding: "14px 12px 8px",
    display: "flex", flexDirection: "column", gap: 3,
  },
  emptyChat: { textAlign: "center", color: "#bbb", fontSize: 14, fontWeight: 600, marginTop: 48 },
  separator: {
    textAlign: "center", color: "#bbb", fontSize: 11,
    fontWeight: 700, margin: "12px 0 6px",
  },
  msgRow: { display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 2 },
  msgAvatar: {
    width: 28, height: 28, borderRadius: "50%", objectFit: "cover",
    flexShrink: 0, border: "2px solid #fff",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  },
  bubble: {
    maxWidth: "72%", padding: "9px 13px", borderRadius: 18,
    display: "flex", flexDirection: "column", gap: 2,
    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
  },
  bubbleMine: {
    background: "linear-gradient(135deg, #f5c6ff 0%, #e8a0f7 100%)",
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: { background: "#fff", borderBottomLeftRadius: 4 },
  bubbleText: {
    margin: 0, fontSize: 15, lineHeight: 1.45,
    color: "#1a1a2e", fontWeight: 600, wordBreak: "break-word",
  },
  bubbleTime: { fontSize: 10, alignSelf: "flex-end", fontWeight: 700 },
  inputBar: {
    display: "flex", alignItems: "center", gap: 5,
    padding: "9px 10px 14px",
    background: "#fff", borderTop: "1px solid #e8ecf0",
    boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
  },
  iconBtn: {
    background: "none", border: "none", cursor: "pointer",
    padding: 3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  gifBtn: {
    background: "#5b9bd5", border: "none", borderRadius: 6,
    padding: "3px 6px", cursor: "pointer", flexShrink: 0,
  },
  gifText: { color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: 0.5 },
  inputWrap: {
    flex: 1, background: "#f2f4f7", borderRadius: 22,
    padding: "8px 13px", display: "flex", alignItems: "center",
  },
  textInput: {
    background: "none", border: "none", outline: "none",
    resize: "none", width: "100%",
    fontSize: 15, fontFamily: "'Nunito', sans-serif",
    fontWeight: 600, color: "#1a1a2e", lineHeight: 1.4, maxHeight: 80,
  },
  sendWordBtn: {
    background: "none", border: "none", cursor: "pointer",
    padding: "4px 6px", flexShrink: 0,
    fontSize: 15, fontWeight: 800, color: "#5b9bd5",
  },
};