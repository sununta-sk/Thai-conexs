// src/pages/RoomChat.jsx
// Full ThaiFriendly-style chat UI with:
// - Header: name, age/gender/city, online status, scrollable photos, "..." menu
// - Messages: pink/lavender bubbles, avatar on received, timestamps
// - Input bar: emoji, GIF, camera, mic, send

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateSeparator(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000 / 60 / 60);
  if (diff < 1) return "Just now";
  if (diff < 24) return `${diff} hour${diff > 1 ? "s" : ""} ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─── Component ───────────────────────────────────────────────────────────────

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

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const photoScrollRef = useRef(null);

  // ── 1. Session ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/login");
      } else {
        setSession(data.session);
      }
    });
  }, [navigate]);

  // ── 2. Derive the other user's ID from chatId ───────────────────────────────
  const otherUserId = session
    ? chatId.split("_").find((id) => id !== session.user.id)
    : null;

  // ── 3. Fetch other user's profile ──────────────────────────────────────────
  useEffect(() => {
    if (!otherUserId) return;
    supabase
      .from("profiles")
      .select("id, username, avatar_url, photos, details")
      .eq("id", otherUserId)
      .single()
      .then(({ data }) => {
        if (data) setOtherProfile(data);
      });
  }, [otherUserId]);

  // ── 4. Presence / online status ────────────────────────────────────────────
  useEffect(() => {
    if (!session || !otherUserId) return;

    const presenceChannel = supabase.channel(`presence:${chatId}`, {
      config: { presence: { key: session.user.id } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setIsOnline(!!state[otherUserId]);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [session, otherUserId, chatId]);

  // ── 5. Fetch messages + Realtime ───────────────────────────────────────────
  useEffect(() => {
    if (!session || !chatId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true })
        .range(0, 99);
      if (!error) setMessages(data || []);
      setLoading(false);
    };

    fetchMessages();

    // Mark as read
    supabase
      .from("messages")
      .update({ is_read: true })
      .eq("chat_id", chatId)
      .neq("sender_id", session.user.id);

    // Realtime subscription — MUST cleanup on unmount
    const channel = supabase
      .channel(`room:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          // Mark incoming as read immediately
          if (payload.new.sender_id !== session.user.id) {
            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel); // CRITICAL: always cleanup
    };
  }, [session, chatId]);

  // ── 6. Auto-scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── 7. Send message ────────────────────────────────────────────────────────
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
    if (error) {
      console.error("Send error:", error);
      setNewMessage(content); // restore on failure
    }
    setSending(false);
    inputRef.current?.focus();
  }, [newMessage, session, chatId, sending]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Derived profile info ───────────────────────────────────────────────────
  const profileAge = otherProfile?.details?.age ?? "";
  const profileGender = otherProfile?.details?.gender ?? "";
  const profileCity = otherProfile?.details?.city ?? "";
  const allPhotos = [
    ...(otherProfile?.avatar_url ? [otherProfile.avatar_url] : []),
    ...(otherProfile?.photos ?? []),
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={S.loadingScreen}>
        <div style={S.loadingDot} />
        <div style={{ ...S.loadingDot, animationDelay: "0.15s" }} />
        <div style={{ ...S.loadingDot, animationDelay: "0.3s" }} />
        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
            40% { transform: translateY(-8px); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
        .msg-bubble { animation: fadeUp 0.2s ease; }
        .send-btn:active { transform: scale(0.92); }
        .icon-btn:active { transform: scale(0.88); }
        .photo-thumb { transition: transform 0.15s; cursor: pointer; }
        .photo-thumb:hover { transform: scale(1.05); }
      `}</style>

      {/* ── HEADER ── */}
      <div style={S.header}>
        {/* Back */}
        <button style={S.backBtn} onClick={() => navigate(-1)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Profile info */}
        <div style={S.headerInfo}>
          <div style={S.headerName}>
            {otherProfile?.username ?? "User"}
          </div>
          <div style={S.headerMeta}>
            {[profileAge, profileGender, profileCity].filter(Boolean).join(" / ")}
          </div>
          <div style={S.onlineRow}>
            <div style={{ ...S.onlineDot, background: isOnline ? "#ff9500" : "#ccc" }} />
            <span style={{ ...S.onlineText, color: isOnline ? "#ff9500" : "#aaa" }}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        {/* Photos strip */}
        <div style={S.photoStrip} ref={photoScrollRef}>
          {allPhotos.length > 0 ? (
            allPhotos.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="photo-thumb"
                style={S.photoThumb}
              />
            ))
          ) : (
            <div style={S.photoPlaceholder}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#ccc">
                <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
          )}
        </div>

        {/* More options */}
        <button style={S.moreBtn}>
          <span style={S.moreDots}>···</span>
        </button>
      </div>

      {/* ── MESSAGES ── */}
      <div style={S.messageArea}>
        {messages.length === 0 && (
          <div style={S.emptyState}>
            Say hello to {otherProfile?.username ?? "them"} 👋
          </div>
        )}

        {messages.map((msg, i) => {
          const isMine = msg.sender_id === session?.user?.id;
          const prevMsg = messages[i - 1];
          const showSeparator =
            !prevMsg ||
            new Date(msg.created_at) - new Date(prevMsg.created_at) > 1000 * 60 * 30;

          return (
            <div key={msg.id}>
              {showSeparator && (
                <div style={S.separator}>{formatDateSeparator(msg.created_at)}</div>
              )}
              <div style={{ ...S.msgRow, justifyContent: isMine ? "flex-end" : "flex-start" }}>
                {/* Avatar for received messages */}
                {!isMine && (
                  <img
                    src={otherProfile?.avatar_url ?? ""}
                    alt=""
                    style={S.msgAvatar}
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                )}
                <div className="msg-bubble" style={{ ...S.bubble, ...(isMine ? S.bubbleMine : S.bubbleTheirs) }}>
                  <p style={S.bubbleText}>{msg.content}</p>
                  <span style={{ ...S.bubbleTime, color: isMine ? "rgba(255,255,255,0.65)" : "#aaa" }}>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {/* ── INPUT BAR ── */}
      <div style={S.inputBar}>
        {/* Emoji */}
        <button className="icon-btn" style={S.iconBtn} title="Emoji">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5b9bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </button>

        {/* GIF */}
        <button className="icon-btn" style={{ ...S.iconBtn, ...S.gifBtn }} title="GIF">
          <span style={S.gifText}>GIF</span>
        </button>

        {/* Camera */}
        <button className="icon-btn" style={S.iconBtn} title="Photo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5b9bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </button>

        {/* Text input */}
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

        {/* Mic or Send */}
        {newMessage.trim() ? (
          <button
            className="send-btn"
            style={S.sendBtn}
            onClick={sendMessage}
            disabled={sending}
          >
            <span style={S.sendText}>Send</span>
          </button>
        ) : (
          <button className="icon-btn" style={S.iconBtn} title="Voice">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5b9bd5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = {
  page: {
    display: "flex",
    flexDirection: "column",
    height: "100dvh",
    background: "#eef2f7",
    fontFamily: "'Nunito', sans-serif",
    overflow: "hidden",
  },

  // Loading
  loadingScreen: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100dvh",
    gap: 8,
    background: "#eef2f7",
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#c9a4d4",
    animation: "bounce 1.2s ease-in-out infinite",
  },

  // Header
  header: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px 10px 8px",
    background: "#fff",
    borderBottom: "1px solid #e8ecf0",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    minHeight: 72,
    position: "relative",
    zIndex: 10,
  },
  backBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#5b9bd5",
    padding: "4px 2px",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  headerInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    minWidth: 0,
    flexShrink: 0,
  },
  headerName: {
    fontSize: 16,
    fontWeight: 800,
    color: "#1a1a2e",
    whiteSpace: "nowrap",
  },
  headerMeta: {
    fontSize: 12,
    color: "#666",
    fontWeight: 600,
  },
  onlineRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
  },
  onlineText: {
    fontSize: 12,
    fontWeight: 700,
  },

  // Photo strip
  photoStrip: {
    display: "flex",
    gap: 6,
    overflowX: "auto",
    flex: 1,
    alignItems: "center",
    padding: "0 4px",
    scrollbarWidth: "none",
  },
  photoThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    objectFit: "cover",
    border: "2px solid #e8ecf0",
    flexShrink: 0,
  },
  photoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 10,
    background: "#f0f0f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  moreBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 6px",
    flexShrink: 0,
  },
  moreDots: {
    fontSize: 22,
    color: "#999",
    letterSpacing: 1,
    fontWeight: 900,
  },

  // Messages
  messageArea: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 12px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  emptyState: {
    textAlign: "center",
    color: "#aaa",
    fontSize: 14,
    marginTop: 40,
    fontWeight: 600,
  },
  separator: {
    textAlign: "center",
    color: "#aaa",
    fontSize: 12,
    fontWeight: 700,
    margin: "12px 0 8px",
    letterSpacing: 0.3,
  },
  msgRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 7,
    marginBottom: 4,
  },
  msgAvatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
    border: "2px solid #fff",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  },
  bubble: {
    maxWidth: "72%",
    padding: "10px 14px",
    borderRadius: 20,
    display: "flex",
    flexDirection: "column",
    gap: 3,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  bubbleMine: {
    background: "linear-gradient(135deg, #e8b4f0 0%, #d4a0e8 100%)",
    borderBottomRightRadius: 5,
    alignSelf: "flex-end",
  },
  bubbleTheirs: {
    background: "#fff",
    borderBottomLeftRadius: 5,
    alignSelf: "flex-start",
  },
  bubbleText: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.45,
    color: "#1a1a2e",
    fontWeight: 600,
    wordBreak: "break-word",
  },
  bubbleTime: {
    fontSize: 10,
    alignSelf: "flex-end",
    fontWeight: 700,
  },

  // Input bar
  inputBar: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 10px 14px",
    background: "#fff",
    borderTop: "1px solid #e8ecf0",
    boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "transform 0.1s",
  },
  gifBtn: {
    background: "#5b9bd5",
    borderRadius: 6,
    padding: "3px 6px",
  },
  gifText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.5,
  },
  inputWrap: {
    flex: 1,
    background: "#f2f4f7",
    borderRadius: 22,
    padding: "8px 14px",
    display: "flex",
    alignItems: "center",
  },
  textInput: {
    background: "none",
    border: "none",
    outline: "none",
    resize: "none",
    width: "100%",
    fontSize: 15,
    fontFamily: "'Nunito', sans-serif",
    fontWeight: 600,
    color: "#1a1a2e",
    lineHeight: 1.4,
    maxHeight: 80,
  },
  sendBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 8px",
    transition: "transform 0.1s",
    flexShrink: 0,
  },
  sendText: {
    fontSize: 15,
    fontWeight: 800,
    color: "#5b9bd5",
  },
};