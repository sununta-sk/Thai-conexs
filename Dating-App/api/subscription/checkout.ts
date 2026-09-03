// api/subscription/checkout.ts — POST /api/subscription/checkout
// Creates a Stripe Checkout Session (mode: "subscription"). Ported from
// the never-migrated api/routes/subscription.js (`router.post("/checkout",
// ...)`), which lived only in the old Railway-hosted server.js and was
// never actually reachable on Vercel. Stripe/Supabase logic unchanged —
// structural port only, same as index.ts.
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const config = { runtime: 'nodejs' };

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

// Duplicated inline per this repo's established per-file convention
// (no shared config module) — same 4 env vars reported ahead of this step.
const STRIPE_PRICES: Record<string, Record<string, string | undefined>> = {
  gold:     { monthly: process.env.STRIPE_GOLD_MONTHLY_PRICE_ID,     yearly: process.env.STRIPE_GOLD_YEARLY_PRICE_ID },
  platinum: { monthly: process.env.STRIPE_PLATINUM_MONTHLY_PRICE_ID, yearly: process.env.STRIPE_PLATINUM_YEARLY_PRICE_ID },
};

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
    const { plan, billing = "monthly" } = req.body || {};
    const priceId = STRIPE_PRICES[plan]?.[billing];
    if (!priceId) return res.status(400).json({ message: "Invalid plan/billing" });

    // No CLIENT_URL env var exists anywhere in this project (checked
    // before writing this file) — subscription.js's original
    // `${process.env.CLIENT_URL}/payment...` would have produced
    // "undefined/payment..." and been rejected by Stripe as an invalid
    // success_url/cancel_url. Deriving the origin from the request instead
    // matches the same same-origin approach already adopted for the
    // frontend fetch call below, and needs no per-deployment config —
    // works correctly on Preview and Production alike without a static
    // env var that would otherwise have to track whichever Preview URL
    // happens to be current.
    const origin = req.headers.origin || `https://${req.headers.host}`;

    const { data: existing } = await supabaseAdmin
      .from("user_subscriptions")
      .select("processor_customer_id")
      .eq("user_id", user.id)
      .not("processor_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    let customerId = existing?.processor_customer_id;
    if (!customerId) {
      const c = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
      customerId = c.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/payment?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment?cancelled=true`,
      metadata: { userId: user.id, plan, billing },
      subscription_data: { metadata: { userId: user.id, plan, billing } },
    });

    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
