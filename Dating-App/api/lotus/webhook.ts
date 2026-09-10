// api/lotus/webhook.ts — POST /api/lotus/webhook
// Stripe webhook endpoint that completes a lotus purchase pack checkout
// (api/lotus/checkout.ts, mode: "payment") by crediting lotus_balance and
// writing a lotus_ledger row once the Checkout Session actually finishes.
// This is a dedicated endpoint — a separate Stripe Dashboard webhook
// subscription from any subscription-mode webhook, with its own signing
// secret, so it never shares config with subscription/checkout.ts.
//
// No requireAuth here: this is called server-to-server by Stripe, not by
// a logged-in browser session, so there's no Authorization header to
// check — the Stripe signature below is what stands in for auth. No CORS
// headers either, for the same reason (Stripe never sends a preflight).
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Manual raw-body collection instead of node:stream/consumers' buffer() —
// the classic pattern used in nearly every working Vercel+Stripe webhook
// example. Collects the exact Buffer chunks off the request stream before
// anything else can touch it.
function readRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export const config = { runtime: 'nodejs' };

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const sig = req.headers["stripe-signature"];
  if (!sig) return res.status(400).json({ error: "missing_signature" });

  let event: Stripe.Event;
  try {
    // Read the raw body ourselves off the request stream — req.body must
    // never be touched anywhere in this file, before or after this line.
    // Vercel's request.body helper is a lazy getter (only parses on
    // access, per Vercel's Node.js runtime docs), so as long as nothing
    // here reads req.body first, the exact bytes Stripe signed are still
    // available to read raw. There's no per-function equivalent of
    // Next.js's `bodyParser: false` for plain Vercel functions like this
    // one — NODEJS_HELPERS=0 exists but is project-wide, and would also
    // break req.body in checkout.ts and every other route in this repo,
    // so it's not used here.
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_LOTUS_WEBHOOK_SECRET || ""
    );
  } catch (err: any) {
    return res.status(400).json({ error: `signature_verification_failed: ${err.message}` });
  }

  if (event.type !== "checkout.session.completed") {
    // Ack anything we don't care about so Stripe doesn't retry it.
    return res.status(200).json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // mode check is what actually keeps this endpoint payment-pack-only —
  // checkout.session.completed fires for subscription-mode sessions too,
  // so if a subscription webhook is ever pointed at this same route (it
  // shouldn't be, but this is what makes that safe rather than assumed),
  // this is the line that stops it from being treated as a lotus purchase.
  if (session.mode !== "payment") {
    return res.status(200).json({ received: true, ignored: "non-payment-mode" });
  }

  if (session.payment_status !== "paid") {
    // checkout.ts only offers payment_method_types: ["card"], which is
    // always "paid" by the time this event fires — same check
    // subscription/verify.ts already makes, kept here for the same
    // reason: cheap, and correct if that ever changes.
    return res.status(200).json({ received: true, ignored: "not_paid" });
  }

  const { userId, totalLotus } = session.metadata || {};
  const amount = Number(totalLotus);

  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    // Malformed/unexpected metadata can never succeed on retry either —
    // ack with 200 so Stripe stops resending it, but log for visibility.
    console.error("lotus webhook: missing/invalid metadata on session", session.id);
    return res.status(200).json({ received: true, ignored: "invalid_metadata" });
  }

  const { data, error } = await supabaseAdmin.rpc("credit_lotus_purchase", {
    p_user_id: userId,
    p_stripe_session_id: session.id,
    p_amount: amount,
  });

  if (error) {
    // Real failure (DB unreachable, RPC error) — non-2xx so Stripe
    // retries this event later instead of the purchase being lost.
    console.error("lotus webhook: credit_lotus_purchase failed", error);
    return res.status(500).json({ error: "credit_failed" });
  }

  return res.status(200).json({ received: true, ...data });
}
