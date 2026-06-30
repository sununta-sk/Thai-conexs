// api/notifications/fcm-token.ts — POST /api/notifications/fcm-token
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: 'nodejs' };

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

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

  const user = await requireAuth(req, res);
  if (!user) return;

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: "token required" });
  const { error } = await supabaseAdmin
    .from("user_fcm_tokens")
    .upsert(
      { user_id: user.id, token, updated_at: new Date().toISOString() },
      { onConflict: "user_id,token" }
    );
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
}
