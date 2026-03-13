const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");

function getStripe() { return require("stripe")(process.env.STRIPE_SECRET_KEY); }
function getSupabase() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const STRIPE_PRICES = {
  gold:     { monthly: process.env.STRIPE_GOLD_MONTHLY_PRICE_ID,     yearly: process.env.STRIPE_GOLD_YEARLY_PRICE_ID },
  platinum: { monthly: process.env.STRIPE_PLATINUM_MONTHLY_PRICE_ID, yearly: process.env.STRIPE_PLATINUM_YEARLY_PRICE_ID },
};

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { data } = await getSupabase().from("user_subscriptions")
      .select("id,status,billing_interval,amount_paid,currency,current_period_start,current_period_end,cancel_at_period_end,processor_subscription_id,processor_customer_id,subscription_plans(name)")
      .eq("user_id", req.user.id).in("status", ["active","trialing","past_due","cancelling"])
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!data) return res.json({ plan: "free", status: "none" });
    return res.json({ plan: data.subscription_plans?.name?.toLowerCase() || "free", billing: data.billing_interval || "monthly", status: data.status, expiresAt: data.current_period_end, cancelAtPeriodEnd: data.cancel_at_period_end });
  } catch (err) { res.status(500).json({ message: "Server error" }); }
});

router.post("/checkout", authMiddleware, async (req, res) => {
  try {
    const { plan, billing = "monthly" } = req.body;
    const priceId = STRIPE_PRICES[plan]?.[billing];
    if (!priceId) return res.status(400).json({ message: "Invalid plan/billing" });
    const supabase = getSupabase();
    const { data: existing } = await supabase.from("user_subscriptions").select("processor_customer_id").eq("user_id", req.user.id).not("processor_customer_id", "is", null).limit(1).maybeSingle();
    let customerId = existing?.processor_customer_id;
    if (!customerId) { const c = await getStripe().customers.create({ email: req.user.email, metadata: { userId: req.user.id } }); customerId = c.id; }
    const session = await getStripe().checkout.sessions.create({ customer: customerId, payment_method_types: ["card"], mode: "subscription", line_items: [{ price: priceId, quantity: 1 }], success_url: `${process.env.CLIENT_URL}/payment?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${process.env.CLIENT_URL}/payment?cancelled=true`, metadata: { userId: req.user.id, plan, billing }, subscription_data: { metadata: { userId: req.user.id, plan, billing } } });
    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/verify", authMiddleware, async (req, res) => {
  try {
    const session = await getStripe().checkout.sessions.retrieve(req.body.sessionId, { expand: ["subscription"] });
    if (session.payment_status !== "paid") return res.status(400).json({ message: "Payment not completed" });
    const sub = session.subscription;
    const { data: planData } = await getSupabase().from("subscription_plans").select("id").ilike("name", session.metadata.plan).single();
    await getSupabase().from("user_subscriptions").upsert({ user_id: req.user.id, plan_id: planData.id, status: "active", billing_interval: session.metadata.billing, current_period_start: new Date(sub.current_period_start*1000).toISOString(), current_period_end: new Date(sub.current_period_end*1000).toISOString(), payment_processor: "stripe", processor_subscription_id: sub.id, processor_customer_id: session.customer, cancel_at_period_end: false, amount_paid: (session.amount_total||0)/100, currency: session.currency?.toUpperCase()||"THB", updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    res.json({ success: true, plan: session.metadata.plan });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/cancel", authMiddleware, async (req, res) => {
  try {
    const { data: sub } = await getSupabase().from("user_subscriptions").select("processor_subscription_id").eq("user_id", req.user.id).eq("status", "active").maybeSingle();
    if (!sub) return res.status(404).json({ message: "No active subscription" });
    await getStripe().subscriptions.update(sub.processor_subscription_id, { cancel_at_period_end: true });
    await getSupabase().from("user_subscriptions").update({ cancel_at_period_end: true, status: "cancelling", updated_at: new Date().toISOString() }).eq("user_id", req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  let event;
  try { event = getStripe().webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET); }
  catch (err) { return res.status(400).send(`Webhook Error: ${err.message}`); }
  try {
    const s = event.data.object;
    if (event.type === "customer.subscription.updated" && s.metadata?.userId)
      await getSupabase().from("user_subscriptions").update({ status: s.status, current_period_end: new Date(s.current_period_end*1000).toISOString(), cancel_at_period_end: s.cancel_at_period_end, updated_at: new Date().toISOString() }).eq("user_id", s.metadata.userId);
    if (event.type === "customer.subscription.deleted" && s.metadata?.userId)
      await getSupabase().from("user_subscriptions").update({ status: "expired", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", s.metadata.userId);
    if (event.type === "invoice.payment_failed")
      await getSupabase().from("user_subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("processor_customer_id", s.customer);
    if (event.type === "invoice.payment_succeeded")
      await getSupabase().from("user_subscriptions").update({ status: "active", updated_at: new Date().toISOString() }).eq("processor_customer_id", s.customer).eq("status", "past_due");
    res.json({ received: true });
  } catch (err) { res.status(500).json({ error: "Webhook processing failed" }); }
});

module.exports = router;
