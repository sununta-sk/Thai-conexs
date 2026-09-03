// api/subscription/verify.ts — POST /api/subscription/verify
// Confirms a completed Stripe Checkout Session and upserts
// user_subscriptions. Ported from the never-migrated
// api/routes/subscription.js (`router.post("/verify", ...)`), which lived
// only in the old Railway-hosted server.js and was never actually
// reachable on Vercel. Stripe/Supabase logic unchanged — structural port
// only, same as index.ts/checkout.ts.
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
    const { sessionId } = req.body || {};
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });

    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    const sub: any = session.subscription;

    const { data: planData } = await supabaseAdmin
      .from("subscription_plans")
      .select("id")
      .ilike("name", session.metadata?.plan || "")
      .single();

    await supabaseAdmin.from("user_subscriptions").upsert({
      user_id: user.id,
      plan_id: planData?.id,
      status: "active",
      billing_interval: session.metadata?.billing,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      payment_processor: "stripe",
      processor_subscription_id: sub.id,
      processor_customer_id: session.customer,
      cancel_at_period_end: false,
      amount_paid: (session.amount_total || 0) / 100,
      currency: session.currency?.toUpperCase() || "THB",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    res.json({ success: true, plan: session.metadata?.plan });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
