// src/hooks/useNotifications.js
// Phase 6C — เพิ่ม FCM token บน Phase 8 ที่มีอยู่แล้ว

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { requestFCMToken, onForegroundMessage } from "../lib/firebase";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function useNotifications() {
  const [notifications, setNotifications]   = useState([]);
  const [unreadCount, setUnreadCount]        = useState(0);
  const [loading, setLoading]                = useState(true);
  const [preferences, setPreferences]        = useState(null);
  const [fcmPermission, setFcmPermission]    = useState(Notification?.permission || "default");
  const sessionRef                           = useRef(null);
  const unsubFcmRef                          = useRef(null);

  // ── Fetch notifications from API ────────────────────────────────────────
  const fetchNotifications = useCallback(async ({ page = 1, limit = 20, unreadOnly = false } = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    sessionRef.current = session;

    try {
      const params = new URLSearchParams({ page, limit, ...(unreadOnly && { unread_only: "true" }) });
      const res = await fetch(`${API_BASE}/api/notifications?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error("[useNotifications] fetch:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Mark as read ─────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (notificationId) => {
    const session = sessionRef.current;
    if (!session) return;

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    await fetch(`${API_BASE}/api/notifications/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ notification_id: notificationId }),
    });
  }, []);

  // ── Mark ALL as read ─────────────────────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    await fetch(`${API_BASE}/api/notifications/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ all: true }),
    });
  }, []);

  // ── Delete notification ──────────────────────────────────────────────────
  const deleteNotification = useCallback(async (notificationId) => {
    const session = sessionRef.current;
    if (!session) return;

    setNotifications(prev => {
      const removed = prev.find(n => n.id === notificationId);
      if (removed && !removed.is_read) setUnreadCount(c => Math.max(0, c - 1));
      return prev.filter(n => n.id !== notificationId);
    });

    await fetch(`${API_BASE}/api/notifications/${notificationId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  }, []);

  // ── Load preferences ──────────────────────────────────────────────────────
  const loadPreferences = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    const res = await fetch(`${API_BASE}/api/notifications/preferences`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) setPreferences(await res.json());
  }, []);

  // ── Update preferences ────────────────────────────────────────────────────
  const updatePreferences = useCallback(async (updates) => {
    const session = sessionRef.current;
    if (!session) return;
    setPreferences(prev => ({ ...prev, ...updates }));
    await fetch(`${API_BASE}/api/notifications/preferences`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(updates),
    });
  }, []);

  // ── Save FCM token to backend ─────────────────────────────────────────────
  const saveFCMToken = useCallback(async (token) => {
    const session = sessionRef.current;
    if (!session || !token) return;
    try {
      await fetch(`${API_BASE}/api/notifications/fcm-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ token }),
      });
    } catch (err) {
      console.error("[useNotifications] saveFCMToken:", err.message);
    }
  }, []);

  // ── Request FCM permission + get token ───────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return "not_supported";
    if (Notification.permission === "granted") return "granted";

    const token = await requestFCMToken();
    const permission = Notification.permission;
    setFcmPermission(permission);

    if (token) {
      localStorage.setItem("fcm_token", token);
      await saveFCMToken(token);
    }
    return permission;
  }, [saveFCMToken]);

  // ── Supabase Realtime ─────────────────────────────────────────────────────
  useEffect(() => {
    let channel;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      sessionRef.current = session;

      await fetchNotifications();
      await loadPreferences();

      // ── Auto-register FCM token ถ้าเคย grant ไว้แล้ว ─────────────────
      if (Notification.permission === "granted") {
        const saved = localStorage.getItem("fcm_token");
        if (!saved) {
          const token = await requestFCMToken();
          if (token) {
            localStorage.setItem("fcm_token", token);
            await saveFCMToken(token);
          }
        } else {
          // Ensure backend has it (กรณี login ใหม่)
          await saveFCMToken(saved);
        }
      }

      // ── Listen foreground FCM messages ────────────────────────────────
      const unsub = await onForegroundMessage((payload) => {
        const { notification, data } = payload;
        const newNotif = {
          id:         data?.notification_id || Date.now().toString(),
          title:      notification?.title || "การแจ้งเตือนใหม่",
          body:       notification?.body || "",
          type:       data?.type || "system",
          data:       data || {},
          is_read:    false,
          created_at: new Date().toISOString(),
        };
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      });
      unsubFcmRef.current = unsub;

      // ── Supabase Realtime ─────────────────────────────────────────────
      channel = supabase
        .channel(`notifications:${session.user.id}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "notifications",
          filter: `user_id=eq.${session.user.id}`,
        }, (payload) => {
          const newNotif = payload.new;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);

          if (Notification.permission === "granted") {
            new Notification(newNotif.title, {
              body: newNotif.body, icon: "/logo192.png",
              badge: "/logo192.png", tag: newNotif.type,
            });
          }
        })
        .on("postgres_changes", {
          event: "UPDATE", schema: "public", table: "notifications",
          filter: `user_id=eq.${session.user.id}`,
        }, (payload) => {
          setNotifications(prev =>
            prev.map(n => n.id === payload.new.id ? payload.new : n)
          );
        })
        .subscribe();
    };

    init();
    return () => {
      if (channel) supabase.removeChannel(channel);
      if (unsubFcmRef.current) unsubFcmRef.current();
    };
  }, [fetchNotifications, loadPreferences, saveFCMToken]);

  return {
    notifications,
    unreadCount,
    loading,
    preferences,
    fcmPermission,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadPreferences,
    updatePreferences,
    requestPermission,
    hasUnread: unreadCount > 0,
  };
}