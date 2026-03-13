import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function translateMessage(text, targetLang) {
  if (!text?.trim()) return text;
  try {
    const res = await fetch(`${API_BASE}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLang }),
    });
    const data = await res.json();
    return data.translated || text;
  } catch (err) {
    console.warn("Translate failed:", err.message);
    return text;
  }
}

const HEADER_H = 70;
const INPUT_H  = 65;
const NAVBAR_H = 65;

export default function RoomChat() {
  const { chatId } = useParams();
  const navigate = useNavigate();

  const [session, setSession]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [messages, setMessages]           = useState([]);
  const [newMessage, setNewMessage]       = useState("");
  const [otherProfile, setOtherProfile]   = useState(null);
  const [isSending, setIsSending]         = useState(false);
  const [isVerified, setIsVerified]       = useState(false);
  const [preferredLang, setPreferredLang] = useState("th");
  const [translating, setTranslating]     = useState(false);
  const [showOriginal, setShowOriginal]   = useState({});

  const bottomRef        = useRef(null);
  const preferredLangRef = useRef("th");

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { session: s }, error } = await supabase.auth.getSession();
      if (error || !s) { navigate("/login"); return; }
      setSession(s);

      const { data: me } = await supabase
        .from("profiles").select("is_verified, preferred_lang")
        .eq("id", s.user.id).maybeSingle();

      const lang = me?.preferred_lang || "th";
      setIsVerified(me?.is_verified || false);
      setPreferredLang(lang);
      preferredLangRef.current = lang;

      await Promise.all([loadOtherProfile(s.user.id), fetchMsgs(lang)]);
      setLoading(false);
    };
    init();

    const ch = supabase.channel(`rc:${chatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (p) => {
        const inc = p.new;
        if (inc.room_id !== chatId && inc.chat_id !== chatId) return;
        const translated = await translateMessage(inc.content, preferredLangRef.current);
        setMessages(prev =>
          prev.find(m => m.id === inc.id)
            ? prev
            : [...prev, { ...inc, translated_content: translated, original_content: inc.content }]
        );
      }).subscribe();

    return () => supabase.removeChannel(ch);
  }, [chatId]);

  const loadOtherProfile = async (myId) => {
    const otherId = chatId.split("_").find(id => id !== myId);
    if (!otherId) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", otherId).maybeSingle();
    if (data?.photos) {
      data.photos = data.photos.map(p => {
        const path = typeof p === "string" ? p : p?.url;
        if (!path) return null;
        return path.startsWith("http")
          ? path
          : supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      }).filter(Boolean);
    }
    setOtherProfile(data);
  };

  const fetchMsgs = async (lang) => {
    const { data: msgs } = await supabase.from("messages")
      .select("*")
      .or(`room_id.eq.${chatId},chat_id.eq.${chatId}`)
      .order("created_at", { ascending: true });
    if (!msgs) return;

    setTranslating(true);
    const out = await Promise.all(msgs.map(async m => ({
      ...m,
      original_content:   m.content,
      translated_content: await translateMessage(m.content, lang),
    })));
    setMessages(out);
    setTranslating(false);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!newMessage.trim() || !session || isSending || !isVerified) return;
    const content = newMessage.trim();
    setNewMessage("");
    setIsSending(true);
    const { error } = await supabase.from("messages").insert({
      room_id: chatId, chat_id: chatId,
      sender_id: session.user.id, content,
    });
    if (error) { console.error(error.message); setNewMessage(content); }
    setIsSending(false);
  };

  const toggleOriginal = (msgId) => {
    setShowOriginal(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f0f2f5" }}>
      <div style={{ textAlign: "center", color: "#6366f1" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
        <p style={{ margin: 0, fontSize: 14 }}>กำลังโหลด...</p>
      </div>
    </div>
  );

  const inputBottom = NAVBAR_H;
  const msgTop      = HEADER_H + (translating ? 26 : 0);
  const msgBottom   = INPUT_H + NAVBAR_H;

  return (
    <div style={{ position: "relative", height: "100vh", background: "#f0f2f5" }}>

      {/* ── HEADER ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0,
        height: `${HEADER_H}px`, zIndex: 100,
        background: "#fff", borderBottom: "1px solid #eee",
        display: "flex", alignItems: "center", padding: "0 15px",
        boxSizing: "border-box",
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", color: "#007bff", marginRight: 12 }}
        >〈</button>

        <img
          src={otherProfile?.avatar_url || "https://via.placeholder.com/50"}
          style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover" }}
        />

        <div style={{ marginLeft: 10, flexShrink: 0, marginRight: 12 }}>
          <div style={{ fontWeight: "bold", fontSize: 15, color: "#4a4a4a" }}>
            {otherProfile?.username || "User"}
          </div>
          <div style={{ fontSize: 11, color: "#2ecc71", fontWeight: "bold" }}>● Online</div>
        </div>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", flex: 1 }}>
          {otherProfile?.photos?.map((p, i) => (
            <img key={i} src={p} style={{ width: 46, height: 46, borderRadius: 8, objectFit: "cover", border: "1px solid #ddd", flexShrink: 0 }} />
          ))}
        </div>

        <div style={{ flexShrink: 0, fontSize: 11, color: "#6366f1", fontWeight: "bold", marginLeft: 6, background: "#ede9fe", padding: "4px 8px", borderRadius: 10 }}>
          🌐 {preferredLang.toUpperCase()}
        </div>
      </div>

      {/* ── TRANSLATING BANNER ── */}
      {translating && (
        <div style={{
          position: "fixed", top: `${HEADER_H}px`, left: 0, right: 0,
          height: 26, zIndex: 99,
          background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, color: "#6366f1", fontWeight: "bold",
        }}>
          🔄 กำลังแปลข้อความ...
        </div>
      )}

      {/* ── MESSAGES ── */}
      <div style={{
        position: "fixed",
        top: `${msgTop}px`,
        bottom: `${msgBottom}px`,
        left: 0, right: 0,
        overflowY: "auto",
        padding: "12px 15px",
        display: "flex", flexDirection: "column",
        zIndex: 10,
      }}>
        <div style={{ flexGrow: 1 }} />

        {messages.map((msg, i) => {
          const isMine         = msg.sender_id === session?.user?.id;
          const hasTranslation = !isMine && msg.translated_content && msg.translated_content !== msg.original_content;
          const isShowOri      = showOriginal[msg.id];
          const display        = isMine
            ? msg.content
            : isShowOri
            ? msg.original_content
            : (msg.translated_content || msg.content);

          return (
            <div key={i} style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "75%", marginBottom: 8 }}>
              <div style={{
                background: isMine ? "#e91e63" : "#fff",
                color: isMine ? "#fff" : "#333",
                padding: "10px 15px", borderRadius: 18,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                fontSize: 15, wordBreak: "break-word",
              }}>
                {display}
              </div>

              {hasTranslation && (
                <div style={{ marginTop: 3, paddingLeft: 5 }}>
                  <button
                    onClick={() => toggleOriginal(msg.id)}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, color: "#6366f1", textDecoration: "underline" }}
                  >
                    {isShowOri ? `🌐 ดูคำแปล (${preferredLang.toUpperCase()})` : "💬 ต้นฉบับ"}
                  </button>
                  {!isShowOri && (
                    <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>• แปลอัตโนมัติ</span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* ── INPUT BAR ── */}
      <div style={{
        position: "fixed",
        bottom: `${inputBottom}px`,
        left: 0, right: 0,
        height: `${INPUT_H}px`,
        background: "#fff", borderTop: "1px solid #eee",
        zIndex: 100, display: "flex", alignItems: "center",
        boxSizing: "border-box",
      }}>
        {!isVerified ? (
          <div style={{
            width: "100%", padding: "0 16px", background: "#fef9c3",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 10, height: "100%",
          }}>
            <div>
              <div style={{ fontWeight: "bold", color: "#92400e", fontSize: 13 }}>⚠️ ยังไม่ได้ยืนยันตัวตน</div>
              <div style={{ color: "#a16207", fontSize: 12 }}>ยืนยันตัวตนก่อนถึงจะส่งข้อความได้</div>
            </div>
            <button
              onClick={() => navigate("/profile-setup")}
              style={{ padding: "8px 16px", borderRadius: 20, border: "none", background: "#f59e0b", color: "#fff", fontWeight: "bold", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              ยืนยันตัวตน
            </button>
          </div>
        ) : (
          <div style={{ width: "100%", padding: "0 15px", display: "flex", alignItems: "center", gap: 12, boxSizing: "border-box" }}>
            <input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Type your message..."
              style={{ flex: 1, border: "1px solid #eee", padding: "11px 20px", borderRadius: 30, background: "#f8f9fa", color: "#000", fontSize: 16, outline: "none" }}
            />
            <button
              onClick={send}
              disabled={isSending || !newMessage.trim()}
              style={{ color: isSending ? "#ccc" : "#e91e63", background: "none", border: "none", fontWeight: "bold", cursor: isSending ? "not-allowed" : "pointer", fontSize: 17 }}
            >
              {isSending ? "..." : "Send"}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}