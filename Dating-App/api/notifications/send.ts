// api/notifications/send.ts — POST /api/notifications/send
import { createClient } from "@supabase/supabase-js";
import admin from "firebase-admin";

export const config = { runtime: 'nodejs' };

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      } as any),
    });
  }
} catch (err: any) {
  console.warn("[Firebase] init failed — push notifications disabled:", err.message);
}

async function requireAuth(req: any, res: any): Promise<any> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
  return user;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  const { user_id, title, body, type = "system", data = {}, url = "/" } = req.body || {};
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
    const tokens = (tokenRows || []).map((r: any) => r.token).filter(Boolean);
    let fcmResult = null;
    if (tokens.length > 0) {
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
      const invalidTokens: string[] = [];
      response.responses.forEach((r: any, i: number) => {
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
  } catch (err: any) {
    console.error("[notifications/send]", err.message);
    res.status(500).json({ error: err.message });
  }
}
