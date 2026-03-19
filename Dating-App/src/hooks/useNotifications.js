import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { requestFCMToken, onForegroundMessage } from "../lib/firebase";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState(null);
  const [fcmPermission, setFcmPermission] = useState(Notification?.permission || "default");
  const sessionRef = useRef(null);
  const unsubFcmRef = useRef(null);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    sessionRef.current = session;
    return session ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      if (!sessionRef.current) return;
      const res = await fetch(`${API_BASE}/api/notifications?limit=20`, { headers });
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error("[useNotifications] fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/api/notifications/read`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ notification_id: id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("[useNotifications] markAsRead:", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/api/notifications/read`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("[useNotifications] markAllAsRead:", err);
    }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/api/notifications/${id}`, { method: "DELETE", headers });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error("[useNotifications] delete:", err);
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      if (!sessionRef.current) return;
      const res = await fetch(`${API_BASE}/api/notifications/preferences`, { headers });
      const data = await res.json();
      setPreferences(data);
    } catch (err) {
      console.error("[useNotifications] loadPreferences:", err);
    }
  }, []);

  const updatePreferences = useCallback(async (prefs) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/api/notifications/preferences`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      setPreferences(prev => ({ ...prev, ...prefs }));
    } catch (err) {
      console.error("[useNotifications] updatePreferences:", err);
    }
  }, []);

  const saveFCMToken = useCallback(async (token) => {
    try {
      const headers = await getAuthHeaders();
      if (!sessionRef.current) return;
      await fetch(`${API_BASE}/api/notifications/fcm-token`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    } catch (err) {
      console.error("[useNotifications] saveFCMToken:", err);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const token = await requestFCMToken();
    const perm = Notification?.permission || "default";
    setFcmPermission(perm);
    if (token) await saveFCMToken(token);
    return token;
  }, [saveFCMToken]);

  useEffect(() => {
    fetchNotifications();
    loadPreferences();

    (async () => {
      if (Notification?.permission === "granted") {
        const token = await requestFCMToken();
        if (token) await saveFCMToken(token);
      }
      const unsub = await onForegroundMessage((payload) => {
        const { title, body } = payload.notification || {};
        const newNotif = {
          id: Date.now().toString(),
          title: title || "การแจ้งเตือนใหม่",
          body: body || "",
          type: payload.data?.type || "system",
          data: payload.data || {},
          is_read: false,
          created_at: new Date().toISOString(),
        };
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      });
      unsubFcmRef.current = unsub;
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      sessionRef.current = session;
      if (session) {
        fetchNotifications();
        loadPreferences();
      }
    });

    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
      }, (payload) => {
        setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
      if (unsubFcmRef.current) unsubFcmRef.current();
    };
  }, []);

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
};