require('dotenv').config({ path: '../../.env' });

const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const { authMiddleware } = require("../middleware/auth");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getStripe() {
  return require("stripe")(process.env.STRIPE_SECRET_KEY);
}

const STRIPE_PRICES = {
  gold: {
    monthly: process.env.STRIPE_GOLD_MONTHLY_PRICE_ID,
    yearly:  process.env.STRIPE_GOLD_YEARLY_PRICE_ID,
  },
  platinum: {
    monthly: process.env.STRIPE_PLATINUM_MONTHLY_PRICE_ID,
    yearly:  process.env.STRIPE_PLATINUM_YEARLY_PRICE_ID,
  },
};

async function getPlanId(planName) {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id")
    .ilike("name", planName)
    .single();
  if (error || !data) throw new Error(`Plan "${planName}" not found`);
  return data.id;
}

// GET /api/subscription
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { data } = await supabase
      .from("user_subscriptions")
      .select(`id, status, billing_interval, amount_paid, currency,
        current_period_start, current_period_end,
        cancel_at_period_end, cancelled_at,
        processor_subscription_id, processor_customer_id,
        subscription_plans ( name )`)
      .eq("user_id", req.user.id)
      .in("status", ["active", "trialing", "past_due", "cancelling"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return res.json({ plan: "free", status: "none" });
    return res.json({
      plan: data.subscription_plans?.name?.toLowerCase() || "free",
      billing: data.billing_interval || "monthly",
      status: data.status,
      expiresAt: data.current_period_end,
      cancelAtPeriodEnd: data.cancel_at_period_end,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/subscription/checkout
router.post("/checkout", authMiddleware, async (req, res) => {
  try {
    const stripe = getStripe();
    const { plan, billing = "monthly" } = req.body;
    const userId = req.user.id;
    const email = req.user.email;

    if (!STRIPE_PRICES[plan]) return res.status(400).json({ message: "Invalid plan" });
    const priceId = STRIPE_PRICES[plan][billing];
    if (!priceId) return res.status(400).json({ message: "Invalid billing cycle" });

    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("processor_customer_id")
      .eq("user_id", userId)
      .not("processor_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    let customerId = existingSub?.processor_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { userId } });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/payment?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment?cancelled=true`,
      metadata: { userId, plan, billing },
      subscription_data: { metadata: { userId, plan, billing } },
    });

    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    console.error("POST /subscription/checkout:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/subscription/verify
router.post("/verify", authMiddleware, async (req, res) => {
  try {
    const stripe = getStripe();
    const { sessionId } = req.body;
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });

    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    const stripeSub = session.subscription;
    const plan = session.metadata.plan;
    const billing = session.metadata.billing;
    const planId = await getPlanId(plan);

    const { error } = await supabase
      .from("user_subscriptions")
      .upsert({
        user_id: req.user.id,
        plan_id: planId,
        status: "active",
        billing_interval: billing,
        current_period_start: stripeSub?.current_period_start ? new Date(stripeSub.current_period_start * 1000).toISOString() : new Date().toISOString(),
        current_period_end: stripeSub?.current_period_end ? new Date(stripeSub.current_period_end * 1000).toISOString() : new Date(Date.now()+30*24*60*60*1000).toISOString(),
        payment_processor: "stripe",
        processor_subscription_id: stripeSub.id,
        processor_customer_id: session.customer,
        cancel_at_period_end: false,
        amount_paid: (session.amount_total || 0) / 100,
        currency: session.currency?.toUpperCase() || "THB",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) throw error;
    res.json({ success: true, plan, billing });
  } catch (err) {
    console.error("POST /subscription/verify:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/subscription/cancel
router.post("/cancel", authMiddleware, async (req, res) => {
  try {
    const stripe = getStripe();
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("processor_subscription_id")
      .eq("user_id", req.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!sub) return res.status(404).json({ message: "No active subscription" });

    await stripe.subscriptions.update(sub.processor_subscription_id, { cancel_at_period_end: true });

    await supabase.from("user_subscriptions")
      .update({ cancel_at_period_end: true, status: "cancelling", updated_at: new Date().toISOString() })
      .eq("user_id", req.user.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/subscription/webhook
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const stripe = getStripe();
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (!userId) break;
        await supabase.from("user_subscriptions").update({
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (!userId) break;
        await supabase.from("user_subscriptions").update({
          status: "expired",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
        break;
      }
      case "invoice.payment_failed": {
        await supabase.from("user_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("processor_customer_id", event.data.object.customer);
        break;
      }
      case "invoice.payment_succeeded": {
        await supabase.from("user_subscriptions")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("processor_customer_id", event.data.object.customer)
          .eq("status", "past_due");
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

module.exports = router;