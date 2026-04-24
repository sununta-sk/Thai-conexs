import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";

const TYPE_ICON = {
  new_match:    "💕",
  new_message:  "💬",
  like_received:"❤️",
  system:       "🔔",
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const dropRef = useRef(null);
  const {
    notifications, unreadCount, markAsRead, markAllAsRead,
    hasUnread, fcmPermission, requestPermission,
  } = useNotifications();

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleRequestPermission = async () => {
    setRequesting(true);
    await requestPermission();
    setRequesting(false);
  };

  const handleNotifClick = (notif) => {
    markAsRead(notif.id);
    if (notif.data?.room_id) navigate(`/room-chat/${notif.data.room_id}`);
    else if (notif.type === "new_match") navigate("/messages");
    setOpen(false);
  };

  return (
    <div ref={dropRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "relative", background: "none", border: "none",
          cursor: "pointer", fontSize: 24, padding: 4,
        }}
      >
        🔔
        {hasUnread && (
          <span style={{
            position: "absolute", top: 0, right: 0,
            background: "#e91e63", color: "#fff",
            borderRadius: "50%", fontSize: 10,
            width: 16, height: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "110%",
          width: 320, maxHeight: 480, overflowY: "auto",
          background: "#1e293b", borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          zIndex: 1000, color: "#fff",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", padding: "12px 16px",
            borderBottom: "1px solid #334155",
          }}>
            <span style={{ fontWeight: 700 }}>Notifications</span>
            <div style={{ display: "flex", gap: 8 }}>
              {hasUnread && (
                <button onClick={markAllAsRead} style={{
                  background: "none", border: "none", color: "#e91e63",
                  cursor: "pointer", fontSize: 12,
                }}>Mark all read</button>
              )}
              <button onClick={() => { navigate("/notifications"); setOpen(false); }} style={{
                background: "none", border: "none", color: "#94a3b8",
                cursor: "pointer", fontSize: 12,
              }}>See all →</button>
            </div>
          </div>

          {fcmPermission === "default" && (
            <div style={{
              padding: "10px 16px", background: "#0f172a",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>เปิดรับNotifications</span>
              <button onClick={handleRequestPermission} disabled={requesting} style={{
                background: "#e91e63", border: "none", color: "#fff",
                borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12,
              }}>
                {requesting ? "..." : "Enable"}
              </button>
            </div>
          )}

          {notifications.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
              ไม่มีNotifications
            </div>
          ) : (
            notifications.slice(0, 5).map(notif => (
              <div key={notif.id} onClick={() => handleNotifClick(notif)} style={{
                padding: "12px 16px", cursor: "pointer",
                background: notif.is_read ? "transparent" : "rgba(233,30,99,0.08)",
                borderBottom: "1px solid #1e293b",
                display: "flex", gap: 10, alignItems: "flex-start",
              }}>
                <span style={{ fontSize: 20 }}>{TYPE_ICON[notif.type] || "🔔"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: notif.is_read ? 400 : 700, fontSize: 14 }}>
                    {notif.title}
                  </div>
                  {notif.body && (
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                      {notif.body}
                    </div>
                  )}
                </div>
                {!notif.is_read && (
                  <span style={{
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