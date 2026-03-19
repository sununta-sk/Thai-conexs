const express  = require("express");
const router   = express.Router();
const admin    = require("firebase-admin");
const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
} catch (err) {
  console.warn("[Firebase] init failed:", err.message);
}

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Invalid token" });
  req.user = user;
  next();
}

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
  const { count: unread_count } = await supabaseAdmin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", req.user.id)
    .eq("is_read", false);
  res.json({ notifications: data, total: count, unread_count: unread_count || 0 });
});

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

router.post("/send-test", async (req, res) => {
  const { user_id, title, body, type = "system", data = {}, url = "/" } = req.body;
  if (!user_id || !title) return res.status(400).json({ error: "user_id and title required" });
  try {
    const { data: notifRow, error: dbErr } = await supabaseAdmin
      .from("notifications")
      .insert({ user_id, title, body: body || "", type, data: { ...data, url }, is_read: false })
      .select()
      .single();
    if (dbErr) throw new Error(dbErr.message);
    const { data: tokenRows } = await supabaseAdmin
      .from("user_fcm_tokens")
      .select("token")
      .eq("user_id", user_id);
    const tokens = (tokenRows || []).map(r => r.token).filter(Boolean);
    let fcmResult = null;
    if (tokens.length > 0 && admin.apps.length > 0) {
      const message = {
        notification: { title, body: body || "" },
        data: { type, url, notification_id: notifRow.id },
        tokens,
      };
      const response = await admin.messaging().sendEachForMulticast(message);
      fcmResult = { success: response.successCount, failure: response.failureCount };
    }
    res.json({ ok: true, notification_id: notifRow.id, fcm: fcmResult, tokens_found: tokens.length });
  } catch (err) {
    console.error("[send-test]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/send", requireAuth, async (req, res) => {
  const { user_id, title, body, type = "system", data = {}, url = "/" } = req.body;
  if (!user_id || !title) return res.status(400).json({ error: "user_id and title required" });
  try {
    const { data: notifRow, error: dbErr } = await supabaseAdmin
      .from("notifications")
      .insert({ user_id, title, body: body || "", type, data: { ...data, url }, is_read: false })
      .select()
      .single();
    if (dbErr) throw new Error(dbErr.message);
    const { data: tokenRows } = await supabaseAdmin
      .from("user_fcm_tokens")
      .select("token")
      .eq("user_id", user_id);
    const tokens = (tokenRows || []).map(r => r.token).filter(Boolean);
    let fcmResult = null;
    if (tokens.length > 0 && admin.apps.length > 0) {
      const message = {
        notification: { title, body: body || "" },
        data: {
          type, url,
          notification_id: notifRow.id,
          ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
        },
        tokens,
      };
      const response = await admin.messaging().sendEachForMulticast(message);
      fcmResult = { success: response.successCount, failure: response.failureCount };
      const invalidTokens = [];
      response.responses.forEach((r, i) => {
        if (!r.success && (
          r.error?.code === "messaging/invalid-registration-token" ||
          r.error?.code === "messaging/registration-token-not-registered"
        )) invalidTokens.push(tokens[i]);
      });
      if (invalidTokens.length > 0) {
        await supabaseAdmin.from("user_fcm_tokens").delete().in("token", invalidTokens);
      }
    }
    res.json({ ok: true, notification_id: notifRow.id, fcm: fcmResult });
  } catch (err) {
    console.error("[notifications/send]", err.message);
    res.status(500).json({ error: err.message });
  }
});

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

router.delete("/:id", requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from("notifications")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

router.get("/preferences", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", req.user.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || {
    user_id: req.user.id,
    new_match: true,
    new_message: true,
    like_received: true,
    system: true,
  });
});

router.put("/preferences", requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from("notification_preferences")
    .upsert(
      { user_id: req.user.id, ...req.body, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;