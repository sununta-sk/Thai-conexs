// api/lotus/checkout.ts — POST /api/lotus/checkout
// Creates a Stripe Checkout Session (mode: "payment") for a one-off lotus
// pack purchase. Built directly in the correct per-file Vercel convention
// from the start (unlike the old subscription.js Express-router mistake).
//
// Deliberately different from subscription/checkout.ts's STRIPE_PRICES
// env-var map: lotus_purchase_packs.stripe_price_id (set in the Phase 1
// schema) is the source of truth for pack -> Stripe Price, editable later
// without a code deploy. This file reads it at request time rather than
// hardcoding or env-var-mapping prices — same "no guessing/defaulting on
// missing config" philosophy as activate_boost_with_lotus.
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
    const { baseLotus } = req.body || {};

    const { data: pack, error: packErr } = await supabaseAdmin
      .from("lotus_purchase_packs")
      .select("base_lotus, total_lotus, price_thb, stripe_price_id")
      .eq("base_lotus", baseLotus)
      .maybeSingle();

    if (packErr) return res.status(500).json({ error: "server_error" });
    if (!pack) return res.status(400).json({ error: "invalid_pack" });
    if (!pack.stripe_price_id) return res.status(503).json({ error: "pack_not_configured" });

    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{ price: pack.stripe_price_id, quantity: 1 }],
      success_url: `${origin}/lotus?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/lotus?cancelled=true`,
      metadata: {
        userId: user.id,
        totalLotus: String(pack.total_lotus),
        baseLotus: String(pack.base_lotus),
      },
    });

    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
