// src/components/NotificationBell.jsx
// Phase 6C — เพิ่ม FCM permission prompt บนของเดิม

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";

const TYPE_ICON = {
  new_match:             "🎉",
  new_message:           "💬",
  like_received:         "❤️",
  super_like:            "⭐",
  profile_view:          "👀",
  subscription_expiring: "⏰",
  subscription_updated:  "✅",
  boost_started:         "🚀",
  system:                "📢",
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "เมื่อกี้";
  if (m < 60) return `${m} นาที`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมง`;
  return `${Math.floor(h / 24)} วัน`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const {
    notifications, unreadCount, markAsRead, markAllAsRead,
    hasUnread, fcmPermission, requestPermission,
  } = useNotifications();

  const [open, setOpen]               = useState(false);
  const [requesting, setRequesting]   = useState(false);
  const ref                           = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (notif) => {
    markAsRead(notif.id);
    setOpen(false);
    if (notif.type === "new_message" && notif.data?.room_id) {
      navigate(`/room-chat/${notif.data.room_id}`);
    } else if (notif.type === "new_match") {
      navigate("/messages");
    }
  };

  const handleEnableNotif = async () => {
    setRequesting(true);
    await requestPermission();
    setRequesting(false);
  };

  const preview = notifications.slice(0, 5);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 24, position: "relative", padding: "4px 8px", color: "#4a4a4a",
        }}
        aria-label="Notifications"
      >
        🔔
        {hasUnread && (
          <span style={{
            position: "absolute", top: 0, right: 2,
            background: "#e91e63", color: "#fff",
            borderRadius: "50%", fontSize: 10, fontWeight: "bold",
            minWidth: 18, height: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #fff", lineHeight: 1,
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)",
          width: 340, maxHeight: 480, overflowY: "auto",
          background: "#fff", borderRadius: 16, zIndex: 9999,
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          border: "1px solid #f0f0f0",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px 10px", borderBottom: "1px solid #f5f5f5",
          }}>
            <span style={{ fontWeight: "bold", fontSize: 15, color: "#333" }}>การแจ้งเตือน</span>
            <div style={{ display: "flex", gap: 8 }}>
              {hasUnread && (
                <button onClick={markAllAsRead} style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 12, color: "#6366f1", fontWeight: "bold",
                }}>
                  อ่านทั้งหมด
                </button>
              )}
              <button onClick={() => { navigate("/notifications"); setOpen(false); }} style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 12, color: "#e91e63", fontWeight: "bold",
              }}>
                ดูทั้งหมด →
              </button>
            </div>
          </div>

          {/* FCM Permission Banner — แสดงเฉพาะตอน default (ยังไม่ตัดสินใจ) */}
          {fcmPermission === "default" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 16px",
              background: "#fff8f0",
              borderBottom: "1px solid #ffe5c0",
            }}>
              <span style={{ fontSize: 20 }}>🔔</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: "bold", color: "#333" }}>
                  เปิดรับการแจ้งเตือน
                </div>
                <div style={{ fontSize: 11, color: "#888" }}>
                  ไม่พลาด Match และข้อความใหม่
                </div>
              </div>
              <button
                onClick={handleEnableNotif}
                disabled={requesting}
                style={{
                  background: "#e91e63", color: "#fff",
                  border: "none", borderRadius: 8,
                  padding: "5px 12px", fontSize: 12, fontWeight: "bold",
                  cursor: requesting ? "not-allowed" : "pointer",
                  opacity: requesting ? 0.7 : 1, whiteSpace: "nowrap",
                }}
              >
                {requesting ? "กำลังเปิด..." : "เปิดเลย"}
              </button>
            </div>
          )}

          {/* Notification List */}
          {preview.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#aaa" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
              <div style={{ fontSize: 14 }}>ยังไม่มีการแจ้งเตือน</div>
            </div>
          ) : (
            preview.map(notif => (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "12px 16px", cursor: "pointer",
                  background: notif.is_read ? "#fff" : "#fdf4ff",
                  borderBottom: "1px solid #f8f8f8",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                onMouseLeave={e => e.currentTarget.style.background = notif.is_read ? "#fff" : "#fdf4ff"}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{TYPE_ICON[notif.type] || "🔔"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: notif.is_read ? "normal" : "bold",
                    fontSize: 13, color: "#333",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {notif.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2, lineHeight: 1.4 }}>
                    {notif.body}
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                    {timeAgo(notif.created_at)}
                  </div>
                </div>
                {!notif.is_read && (
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: "#e91e63", flexShrink: 0, marginTop: 4,
                  }} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}