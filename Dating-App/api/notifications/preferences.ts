// api/notifications/preferences.ts — GET/PUT /api/notifications/preferences
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
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorizaon");

  if (req.method === "OPTIONS") return res.status(200).end();

  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || {
      user_id: user.id,
      new_match: true,
      new_message: true,
      like_received: true,
      system: true,
    });
  }

  if (req.method === "PUT") {
    const { error } = await supabaseAdmin
      .from("notification_preferences")
      .upsert(
        { user_id: user.id, ...(req.body || {}), updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
