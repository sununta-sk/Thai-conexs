// api/routes/notifications.js
// Handles: GET /api/notifications, POST /api/notifications/fcm-token,
//          POST /api/notifications/send, POST /api/notifications/read,
//          DELETE /api/notifications/:id, GET|PUT /api/notifications/preferences

const express  = require("express");
const router   = express.Router();
const admin    = require("firebase-admin");
const { createClient } = require("@supabase/supabase-js");

// ── Supabase admin client (service role) ─────────────────────────────────────
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Firebase Admin (init once) ───────────────────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // \n ใน .env ต้องแทนด้วย newline จริง
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

// ── Auth middleware — แกะ JWT จาก Supabase ──────────────────────────────────
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Invalid token" });

  req.user = user;
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", requireAuth, async (req, res) => {
  const { page = 1, limit = 20, unread_only } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = supabaseAdmin
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (unread_only === "true") query = query.eq("is_read", false);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const unread_count = await supabaseAdmin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", req.user.id)
    .eq("is_read", false)
    .then(r => r.count || 0);

  res.json({ notifications: data, total: count, unread_count });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/notifications/fcm-token  — บันทึก FCM token ของ user
// ─────────────────────────────────────────────────────────────────────────────
router.post("/fcm-token", requireAuth, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token required" });

  const { error } = await supabaseAdmin
    .from("user_fcm_tokens")
    .upsert(
      { user_id: req.user.id, token, updated_at: new Date().toISOString() },
      { onConflict: "user_id,token" }
    );

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/notifications/send  — ส่ง push notification ไปหา user
// Body: { user_id, title, body, type, data, url }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/send", requireAuth, async (req, res) => {
  const { user_id, title, body, type = "system", data = {}, url = "/" } = req.body;
  if (!user_id || !title) return res.status(400).json({ error: "user_id and title required" });

  try {
    // 1. บันทึกลง DB ก่อน
    const { data: notifRow, error: dbErr } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id,
        title,
        body:     body || "",
        type,
        data:     { ...data, url },
        is_read:  false,
      })
      .select()
      .single();

    if (dbErr) throw new Error(dbErr.message);

    // 2. ดึง FCM tokens ของ user
    const { data: tokenRows } = await supabaseAdmin
      .from("user_fcm_tokens")
      .select("token")
      .eq("user_id", user_id);

    const tokens = (tokenRows || []).map(r => r.token).filter(Boolean);

    // 3. ส่ง push ถ้ามี token
    let fcmResult = null;
    if (tokens.length > 0) {
      const message = {
        notification: { title, body: body || "" },
        data: {
          type,
          url,
          notification_id: notifRow.id,
          ...Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)])
          ),
        },
        tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      fcmResult = { success: response.successCount, failure: response.failureCount };

      // ลบ token ที่ invalid ออก
      const invalidTokens = [];
      response.responses.forEach((r, i) => {
        if (!r.success && (
          r.error?.code === "messaging/invalid-registration-token" ||
          r.error?.code === "messaging/registration-token-not-registered"
        )) {
          invalidTokens.push(tokens[i]);
        }
      });
      if (invalidTokens.length > 0) {
        await supabaseAdmin
          .from("user_fcm_tokens")
          .delete()
          .in("token", invalidTokens);
      }
    }

    res.json({ ok: true, notification_id: notifRow.id, fcm: fcmResult });
  } catch (err) {
    console.error("[notifications/send]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/notifications/read  — mark as read
// Body: { notification_id } หรือ { all: true }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/read", requireAuth, async (req, res) => {
  const { notification_id, all } = req.body;

  let query = supabaseAdmin
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", req.user.id);

  if (!all) query = query.eq("id", notification_id);

  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/notifications/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from("notifications")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);   // ป้องกันลบของคนอื่น

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications/preferences
// ─────────────────────────────────────────────────────────────────────────────
router.get("/preferences", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", req.user.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  // Default ถ้ายังไม่มีแถว
  res.json(data || {
    user_id:      req.user.id,
    new_match:    true,
    new_message:  true,
    like_received: true,
    system:       true,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/notifications/preferences
// ─────────────────────────────────────────────────────────────────────────────
router.put("/preferences", requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from("notification_preferences")
    .upsert({ user_id: req.user.id, ...req.body, updated_at: new Date().toISOString() },
             { onConflict: "user_id" });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;