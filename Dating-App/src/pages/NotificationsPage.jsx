// src/pages/NotificationsPage.jsx
// Phase 8 — Full notifications page with settings toggle

import { useState } from "react";
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

const TYPE_LABEL = {
  new_match:    "Match ใหม่",
  new_message:  "ข้อความใหม่",
  like_received:"ถูกกดไลก์",
  super_like:   "Super Like",
  profile_view: "มีคนดูโปรไฟล์",
  subscription_expiring: "แจ้งเตือน Subscription",
  subscription_updated:  "Subscription อัพเดต",
  boost_started:"Boost เริ่มทำงาน",
  system:       "ประกาศจากระบบ",
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "เมื่อกี้";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d} วันที่แล้ว`;
  return new Date(dateStr).toLocaleDateString("th-TH");
}

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: "pointer",
        background: value ? "#e91e63" : "#ddd",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 2, left: value ? 22 : 2,
        width: 20, height: 20, borderRadius: "50%",
        background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        transition: "left 0.2s",
      }} />
    </div>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications, unreadCount, loading,
    preferences, markAsRead, markAllAsRead,
    deleteNotification, updatePreferences,
    fetchNotifications, requestPermission,
  } = useNotifications();

  const [tab, setTab] = useState("all"); // 'all' | 'unread' | 'settings'
  const [filter, setFilter] = useState("all");

  const displayed = notifications.filter(n => {
    if (tab === "unread" && n.is_read) return false;
    if (filter !== "all" && n.type !== filter) return false;
    return true;
  });

  const handleClick = (notif) => {
    if (!notif.is_read) markAsRead(notif.id);
    if (notif.type === "new_message" && notif.data?.room_id) {
      navigate(`/room-chat/${notif.data.room_id}`);
    } else if (notif.type === "new_match") {
      navigate("/messages");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div style={{ textAlign: "center", color: "#6366f1" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
          <p>กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", paddingBottom: 80 }}>

      {/* Header */}
      <div style={{
        background: "#fff", padding: "16px 16px 0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#007bff", marginRight: 10 }}
          >〈</button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: "bold", flex: 1 }}>
            การแจ้งเตือน {unreadCount > 0 && (
              <span style={{
                background: "#e91e63", color: "#fff",
                borderRadius: 10, fontSize: 12, padding: "2px 8px", marginLeft: 6,
              }}>
                {unreadCount}
              </span>
            )}
          </h2>
          {unreadCount > 0 && tab !== "settings" && (
            <button
              onClick={markAllAsRead}
              style={{ background: "none", border: "none", color: "#6366f1", fontSize: 13, cursor: "pointer", fontWeight: "bold" }}
            >
              อ่านทั้งหมด
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderTop: "1px solid #f0f0f0" }}>
          {[
            { key: "all",      label: "ทั้งหมด" },
            { key: "unread",   label: `ยังไม่อ่าน${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
            { key: "settings", label: "ตั้งค่า ⚙️" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: "12px 0", border: "none", background: "none",
              fontWeight: tab === t.key ? "bold" : "normal",
              color: tab === t.key ? "#e91e63" : "#666",
              borderBottom: tab === t.key ? "2px solid #e91e63" : "2px solid transparent",
              cursor: "pointer", fontSize: 14, transition: "all 0.2s",
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── NOTIFICATIONS LIST ─────────────────────────────────────────── */}
      {tab !== "settings" && (
        <div>
          {/* Filter chips */}
          <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto" }}>
            {["all", "new_match", "new_message", "like_received", "system"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                background: filter === f ? "#e91e63" : "#fff",
                color: filter === f ? "#fff" : "#555",
                fontSize: 12, fontWeight: filter === f ? "bold" : "normal",
                whiteSpace: "nowrap", boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}>
                {f === "all" ? "ทั้งหมด" : (TYPE_LABEL[f] || f)}
              </button>
            ))}
          </div>

          {displayed.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#aaa" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔕</div>
              <p style={{ margin: 0, fontSize: 15 }}>ไม่มีการแจ้งเตือน</p>
            </div>
          ) : (
            displayed.map(notif => (
              <div
                key={notif.id}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "14px 16px",
                  background: notif.is_read ? "#fff" : "#fdf4ff",
                  borderBottom: "1px solid #f0f0f0",
                  cursor: "pointer",
                }}
                onClick={() => handleClick(notif)}
              >
                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: notif.is_read ? "#f5f5f5" : "#fce7f3",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, flexShrink: 0,
                }}>
                  {TYPE_ICON[notif.type] || "🔔"}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{
                      fontWeight: notif.is_read ? "normal" : "bold",
                      fontSize: 14, color: "#222",
                    }}>
                      {notif.title}
                    </span>
                    {!notif.is_read && (
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e91e63", flexShrink: 0, marginLeft: 6 }} />
                    )}
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555", lineHeight: 1.4 }}>
                    {notif.body}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: "#bbb" }}>{timeAgo(notif.created_at)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                      style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 16, padding: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── SETTINGS TAB ──────────────────────────────────────────────────── */}
      {tab === "settings" && preferences && (
        <div style={{ padding: 16 }}>

          {/* Browser Permission */}
          <div style={{
            background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontWeight: "bold", marginBottom: 4, color: "#333" }}>🔔 การแจ้งเตือนในเบราว์เซอร์</div>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#666" }}>
              อนุญาตให้แอปส่งการแจ้งเตือนแม้ปิดแท็บอยู่
            </p>
            <button
              onClick={async () => {
                const result = await requestPermission();
                if (result === "granted") alert("✅ เปิดการแจ้งเตือนสำเร็จ!");
                else alert("❌ ไม่ได้รับอนุญาต กรุณาเปิดใน Settings ของเบราว์เซอร์");
              }}
              style={{
                background: "#6366f1", color: "#fff", border: "none",
                borderRadius: 20, padding: "8px 20px", cursor: "pointer",
                fontSize: 13, fontWeight: "bold",
              }}
            >
              ขอสิทธิ์การแจ้งเตือน
            </button>
          </div>

          {/* In-App Settings */}
          {[
            { section: "📱 In-App", items: [
              { key: "in_app_new_match",   label: "Match ใหม่" },
              { key: "in_app_new_message", label: "ข้อความใหม่" },
              { key: "in_app_like",        label: "ถูกกดไลก์" },
              { key: "in_app_system",      label: "ข่าวสารระบบ" },
            ]},
            { section: "📧 Email", items: [
              { key: "email_new_match",     label: "Match ใหม่" },
              { key: "email_new_message",   label: "ข้อความใหม่" },
              { key: "email_subscription",  label: "Subscription & การชำระเงิน" },
              { key: "email_weekly_digest", label: "สรุปรายสัปดาห์" },
            ]},
            { section: "📱 SMS", items: [
              { key: "sms_enabled",     label: "เปิดการแจ้งเตือน SMS" },
              { key: "sms_new_match",   label: "Match ใหม่" },
              { key: "sms_new_message", label: "ข้อความใหม่" },
            ]},
          ].map(({ section, items }) => (
            <div key={section} style={{
              background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontWeight: "bold", marginBottom: 12, color: "#333" }}>{section}</div>
              {items.map(item => (
                <div key={item.key} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 0", borderBottom: "1px solid #f5f5f5",
                }}>
                  <span style={{ fontSize: 14, color: "#444" }}>{item.label}</span>
                  <Toggle
                    value={preferences[item.key] ?? false}
                    onChange={(val) => updatePreferences({ [item.key]: val })}
                  />
                </div>
              ))}
            </div>
          ))}

          {/* SMS Phone number */}
          {preferences.sms_enabled && (
            <div style={{
              background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <label style={{ fontWeight: "bold", fontSize: 13, color: "#333" }}>
                📞 เบอร์โทรศัพท์ (รูปแบบ +66812345678)
              </label>
              <input
                type="tel"
                value={preferences.phone_number || ""}
                onChange={e => updatePreferences({ phone_number: e.target.value })}
                placeholder="+66812345678"
                style={{
                  display: "block", width: "100%", marginTop: 8,
                  padding: "10px 14px", borderRadius: 10, border: "1px solid #e0e0e0",
                  fontSize: 14, boxSizing: "border-box",
                }}
              />
            </div>
          )}

          {/* Quiet Hours */}
          <div style={{
            background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontWeight: "bold", color: "#333" }}>🌙 เวลาห้ามรบกวน</span>
              <Toggle
                value={preferences.quiet_hours_enabled}
                onChange={val => updatePreferences({ quiet_hours_enabled: val })}
              />
            </div>
            {preferences.quiet_hours_enabled && (
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { key: "quiet_hours_start", label: "เริ่ม" },
                  { key: "quiet_hours_end",   label: "สิ้นสุด" },
                ].map(({ key, label }) => (
                  <div key={key} style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>{label}</label>
                    <input
                      type="time"
                      value={preferences[key] || ""}
                      onChange={e => updatePreferences({ [key]: e.target.value })}
                      style={{
                        width: "100%", padding: "8px 10px", borderRadius: 8,
                        border: "1px solid #e0e0e0", fontSize: 14, boxSizing: "border-box",
                      }}
                    />
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