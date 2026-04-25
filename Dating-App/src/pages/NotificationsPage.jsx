import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";

const TYPE_ICON = {
  new_match: "🎉",
  new_message: "💬",
  like_received: "❤️",
  super_like: "⭐",
  profile_view: "👀",
  subscription_expiring: "⏰",
  subscription_updated: "✅",
  boost_started: "🚀",
  system: "📢",
};

const TYPE_LABEL = {
  new_match: "New Match",
  new_message: "New Message",
  like_received: "Like Received",
  super_like: "Super Like",
  profile_view: "Profile View",
  subscription_expiring: "Subscription Alert",
  subscription_updated: "Subscription Updated",
  boost_started: "Boost Started",
  system: "System Announcement",
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return m + " min ago";
  const h = Math.floor(m / 60);
   + " hour" + (h > 1 ? "s" : "") + " ago";
  const d = Math.floor(h / 24);
  if (d < 7) return d + " day" + (d > 1 ? "s" : "") + " ago";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", background: value ? "#e91e63" : "#334155", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)", transition: "left 0.2s" }} />
    </div>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, preferences, markAsRead, markAllAsRead, deleteNotification, updatePreferences, requestPermission } = useNotifications();

  const [tab, setTab] = useState("all");
  const [filter, setFilter] = useState("all");

  const displayed = notifications.filter(n => {
    if (tab === "unread" && n.is_read) return false;
    if (filter !== "all" && n.type !== filter) return false;
    return true;
  });

  const handleClick = (notif) => {
    if (!notif.is_read) markAsRead(notif.id);
    if (notif.type === "new_message" && notif.data?.room_id) navigate("/room-chat/" + notif.data.room_id);
    else if (notif.type === "new_match") navigate("/messages");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#0f172a" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
          <p style={{ color: "#94a3b8" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", paddingBottom: 80, paddingTop: 90 }}>
      <div style={{ background: "#1e293b", padding: "16px 16px 0", boxShadow: "0 1px 4px rgba(0,0,0,0.3)", position: "sticky", top: 90, zIndex: 100, borderBottom: "1px solid #334155" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#e91e63", marginRight: 10 }}>〈</button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: "bold", flex: 1, color: "#f1f5f9" }}>
            Notifications {unreadCount > 0 && (<span style={{ background: "#e91e63", color: "#fff", borderRadius: 10, fontSize: 12, padding: "2px 8px", marginLeft: 6 }}>{unreadCount}</span>)}
          </h2>
          {unreadCount > 0 && tab !== "settings" && (
            <button onClick={markAllAsRead} style={{ background: "none", border: "none", color: "#e91e63", fontSize: 13, cursor: "pointer", fontWeight: "bold" }}>Mark all read</button>
          )}
        </div>

        <div style={{ display: "flex", borderTop: "1px solid #334155" }}>
          {[{ key: "all", label: "All" }, { key: "unread", label: "Unread" + (unreadCount > 0 ? " (" + unreadCount + ")" : "") }, { key: "settings", label: "Settings" }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: "12px 0", border: "none", background: "none", fontWeight: tab === t.key ? "bold" : "normal", color: tab === t.key ? "#e91e63" : "#94a3b8", borderBottom: tab === t.key ? "2px solid #e91e63" : "2px solid transparent", cursor: "pointer", fontSize: 14, transition: "all 0.2s" }}>{t.label}</button>
          ))}
        </div>
      </div>

      {tab !== "settings" && (
        <div>
          <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto" }}>
            {["all", "new_match", "new_message", "like_received", "system"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid " + (filter === f ? "#e91e63" : "#334155"), cursor: "pointer", background: filter === f ? "#e91e63" : "#1e293b", color: filter === f ? "#fff" : "#94a3b8", fontSize: 12, fontWeight: filter === f ? "bold" : "normal", whiteSpace: "nowrap" }}>
                {f === "all" ? "All" : (TYPE_LABEL[f] || f)}
              </button>
            ))}
          </div>

          {displayed.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔕</div>
              <p style={{ margin: 0, fontSize: 15 }}>No notifications</p>
            </div>
          ) : (
            displayed.map(notif => (
              <div key={notif.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", background: notif.is_read ? "#1e293b" : "rgba(233, 30, 99, 0.08)", borderBottom: "1px solid #334155", cursor: "pointer" }} onClick={() => handleClick(notif)}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", backgrod: notif.is_read ? "#0f172a" : "rgba(233, 30, 99, 0.2)", border: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  {TYPE_ICON[notif.type] || "🔔"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: notif.is_read ? "normal" : "bold", fontSize: 14, color: "#f1f5f9" }}>{notif.title}</span>
                    {!notif.is_read && (<div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e91e63", flexShrink: 0, marginLeft: 6 }} />)}
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8", lineHeight: 1.4 }}>{notif.body}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{timeAgo(notif.created_at)}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16, padding: 0 }}>✕</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "settings" && preferences && (
        <div style={{ padding: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #334155" }}>
            <div style={{ fontWeight: "bold", marginBottom: 4, color: "#f1f5f9" }}>Browser notifications</div>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#94a3b8" }}>Allow the app to send notifications even when the tab is closed</p>
            <button onClick={async () => { const r = await requestPermission(); alert(r === "granted" ? "Notifications enabled!" : "Permission not grant. Please enable in browser Settings"); }} style={{ background: "#e91e63", color: "#fff", border: "none", borderRadius: 20, padding: "8px 20px", cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>
              Request notification permission
            </button>
          </div>

          {[
            { section: "In-App", items: [{ key: "in_app_new_match", label: "New Match" }, { key: "in_app_new_message", label: "New Message" }, { key: "in_app_like", label: "Like Received" }, { key: "in_app_system", label: "System Updates" }] },
            { section: "Email", items: [{ key: "email_new_match", label: "New Match" }, { key: "email_new_message", label: "New Message" }, { key: "email_subscription", label: "Subscription & Payment" }, { key: "email_weekly_digest", label: "Weekly Digest" }] },
            { section: "SMS", items: [{ key: "sms_enabled", label: "Enable SMS notifications" }, { key: "sms_new_match", label: "New Match" }, { key: "sms_new_message", label: "New Message" }] },
          ].map(({ section, items }) => (
            <div key={section} style={{ background: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #334155" }}>
              <div style={{ fontWeight: "bold", marginBottom: 12, color: "#f1f5f9" }}>{section}</div>
              {items.map(item => (
                <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #334155" }}>
                  <span style={{ fontSize: 14, color: "#cbd5e1" }}>{item.label}</span>
                  <Toggle value={preferences[item.key] ?? false} onChange={(val) => updatePreferences({ [item.key]: val })} />
                </div>
              ))}
            </div>
          ))}

          {preferences.sms_enabled && (
            <div style={{ background: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #334155" }}>
              <label style={{ fontWeight: "bold", fontSize: 13, color: "#f1f5f9" }}>Phone number (format +66812345678)</label>
              <input type="tel" value={preferences.phone_number || ""} onChange={e => updatePreferences({ phone_number: e.target.value })} placeholder="+66812345678" style={{ display: "block", width: "100%", marginTop: 8, padding: "10px 14px", borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: 14, boxSizing: "border-box" }} />
            </div>
          )}

          <div style={{ background: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #334155" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontWeight: "bold", color: "#f1f5f9" }}>Quiet hours</span>
              <Toggle value={preferences.quiet_hours_enabled} onChange={val => updatePreferences({ quiet_hours_enabled: val })} />
            </div>
            {preferences.quiet_hours_enabled && (
              <div style={{ display: "flex", gap: 12 }}>
                {[{ key: "quiet_hours_start", label: "Start" }, { key: "quiet_hours_end", label: "End" }].map(({ key, label }) => (
                  <div key={key} style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 4 }}>{label}</label>
                    <input type="time" value={preferences[key] || ""} onChange={e => updatePreferences({ [key]: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
