// api/subscription/index.ts — GET /api/subscription
// Current plan/status lookup. Pure read, no Stripe calls. Ported from the
// never-migrated api/routes/subscription.js (`router.get("/", ...)`),
// which lived only in the old Railway-hosted server.js and was never
// actually reachable on Vercel.
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
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { data } = await supabaseAdmin
      .from("user_subscriptions")
      .select("id,status,billing_interval,amount_paid,currency,current_period_start,current_period_end,cancel_at_period_end,processor_subscription_id,processor_customer_id,subscription_plans(name)")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due", "cancelling"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return res.json({ plan: "free", status: "none" });

    const plan = Array.isArray(data.subscription_plans)
      ? data.subscription_plans[0]?.name
      : (data.subscription_plans as any)?.name;

    return res.json({
      plan: plan?.toLowerCase() || "free",
      billing: data.billing_interval || "monthly",
      status: data.status,
      expiresAt: data.current_period_end,
      cancelAtPeriodEnd: data.cancel_at_period_end,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}
