// api/subscription/cancel.ts — POST /api/subscription/cancel
// Sets cancel_at_period_end on both Stripe and user_subscriptions. Ported
// from the never-migrated api/routes/subscription.js (`router.post(
// "/cancel", ...)`), which lived only in the old Railway-hosted server.js
// and was never actually reachable on Vercel. Stripe/Supabase logic
// unchanged — structural port only, same as index.ts/checkout.ts.
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const config = { runtime: 'nodejs' };

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

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

  try {
    const { data: sub } = await supabaseAdmin
      .from("user_subscriptions")
      .select("processor_subscription_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!sub) return res.status(404).json({ message: "No active subscription" });

    await stripe.subscriptions.update(sub.processor_subscription_id, { cancel_at_period_end: true });

    await supabaseAdmin
      .from("user_subscriptions")
      .update({ cancel_at_period_end: true, status: "cancelling", updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
