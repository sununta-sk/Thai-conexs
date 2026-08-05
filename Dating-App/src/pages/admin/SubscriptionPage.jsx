import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../../hooks/useSubscription";

// price: { yearly, sixMonth? } in EUR. billingOptions lists which of those
// keys this plan actually offers (Gold has both; Free/Platinum have one).
// audience: 'public' plans show on this page; 'affiliate' plans are only
// ever offered through the affiliate resale flow (not built yet — no
// affiliate-only tier has been defined; add one here with audience:
// 'affiliate' when its name/price/features are decided).
const PLANS = [
  {
    id: "free",
    name: "Free",
    audience: "public",
    price: { yearly: 0 },
    billingOptions: ["yearly"],
    color: "#6b7280",
    gradient: "linear-gradient(135deg, #374151 0%, #1f2937 100%)",
    icon: "🌱",
    features: [
      { label: "5 likes per day", included: true },
      { label: "Basic matching", included: true },
      { label: "Standard chat", included: true },
      { label: "Incognito mode", included: false },
      { label: "See who liked you", included: false },
      { label: "Unlimited likes", included: false },
      { label: "Boost profile", included: false },
      { label: "Translation (10/day)", included: false },
    ],
  },
  {
    id: "gold",
    name: "Gold",
    audience: "public",
    price: { yearly: 125, sixMonth: 90 },
    billingOptions: ["yearly", "sixMonth"],
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    icon: "✨",
    badge: "Popular",
    features: [
      { label: "Unlimited likes", included: true },
      { label: "See who liked you", included: true },
      { label: "Incognito mode", included: true },
      { label: "Basic matching", included: true },
      { label: "Standard chat", included: true },
      { label: "Translation (50/day)", included: true },
      { label: "Profile boost x1/week", included: false },
      { label: "Priority support", included: false },
    ],
  },
  {
    id: "platinum",
    name: "Platinum",
    audience: "public",
    price: { yearly: 175 },
    billingOptions: ["yearly"],
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    icon: "💎",
    badge: "Best Value",
    features: [
      { label: "Everything in Gold", included: true },
      { label: "Unlimited translation", included: true },
      { label: "Profile boost x3/week", included: true },
      { label: "Priority matching", included: true },
      { label: "Read receipts", included: true },
      { label: "Video profile featured", included: true },
      { label: "Priority support", included: true },
      { label: "Exclusive platinum badge", included: true },
    ],
  },
];

const BILLING_LABEL = { yearly: "12 months", sixMonth: "6 months" };

export default function SubscriptionPage() {
  // Per-plan billing selection (only Gold currently has more than one option).
  const [billingByPlan, setBillingByPlan] = useState({ gold: "yearly" });
  const { currentPlan } = useSubscription();
  const navigate = useNavigate();

  // Checkout isn't wired up yet — Mike hasn't created the Stripe account, so
  // there are no real Price IDs to charge against. Subscribe is disabled
  // ("Coming soon") rather than calling out to Stripe with mismatched/fake
  // price IDs. TODO: once real Stripe Price IDs exist for these EUR amounts,
  // re-enable this and call useSubscription().subscribe(plan.id, billing)
  // the same way it worked before.
  const publicPlans = PLANS.filter((p) => p.audience !== "affiliate");

  return (
    <div style={styles.page}>
      <div style={styles.bgOrbs}>
        <div style={{ ...styles.orb, top: "-10%", left: "-5%", background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)", width: 600, height: 600 }} />
        <div style={{ ...styles.orb, bottom: "10%", right: "-10%", background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)", width: 500, height: 500 }} />
      </div>

      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>←</button>
          <div style={styles.headerText}>
            <p style={styles.eyebrow}>UPGRADE YOUR EXPERIENCE</p>
            <h1 style={styles.title}>Choose Your Plan</h1>
            <p style={styles.subtitle}>Unlock premium features and find your perfect match faster</p>
          </div>
        </div>

        <div style={styles.plansGrid}>
          {publicPlans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            const isPlatinum = plan.id === "platinum";
            const hasMultipleBilling = plan.billingOptions.length > 1;
            const selectedBilling = billingByPlan[plan.id] || plan.billingOptions[0];
            const price = plan.price[selectedBilling];

            return (
              <div
                key={plan.id}
                style={{
                  ...styles.planCard,
                  ...(isPlatinum ? styles.planCardFeatured : {}),
                  transform: isPlatinum ? "scale(1.04)" : "scale(1)",
                }}
              >
                {plan.badge && (
                  <div style={{ ...styles.planBadge, background: plan.gradient }}>{plan.badge}</div>
                )}

                <div style={styles.planHeader}>
                  <div style={styles.planIconWrapper}>
                    <div style={{ ...styles.planIconBg, background: plan.gradient }} />
                    <span style={styles.planIcon}>{plan.icon}</span>
                  </div>
                  <h2 style={{ ...styles.planName, color: plan.color }}>{plan.name}</h2>
                </div>

                {hasMultipleBilling && (
                  <div style={{ ...styles.toggle, marginBottom: 16 }}>
                    {plan.billingOptions.map((opt) => (
                      <button
                        key={opt}
                        style={{ ...styles.toggleBtn, padding: "6px 14px", fontSize: 12, ...(selectedBilling === opt ? styles.toggleActive : {}) }}
                        onClick={() => setBillingByPlan(prev => ({ ...prev, [plan.id]: opt }))}
                      >
                        {BILLING_LABEL[opt]}
                      </button>
                    ))}
                  </div>
                )}

                <div style={styles.priceBlock}>
                  {plan.price.yearly === 0 ? (
                    <div style={styles.freeLabel}>Free Forever</div>
                  ) : (
                    <div style={styles.priceRow}>
                      <span style={styles.currency}>€</span>
                      <span style={{ ...styles.price, color: plan.color }}>{price}</span>
                      <span style={styles.period}>/{BILLING_LABEL[selectedBilling].toLowerCase()}</span>
                    </div>
                  )}
                </div>

                <ul style={styles.featureList}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{ ...styles.featureItem, opacity: f.included ? 1 : 0.35 }}>
                      <span style={{ ...styles.featureIcon, color: f.included ? plan.color : "#6b7280" }}>
                        {f.included ? "✓" : "✗"}
                      </span>
                      <span style={styles.featureLabel}>{f.label}</span>
                    </li>
                  ))}
                </ul>

                <button
                  disabled
                  title="Checkout isn't connected to a live payment processor yet"
                  style={{
                    ...styles.ctaBtn,
                    background: "#374151",
                    opacity: 0.6,
                    cursor: "default",
                  }}
                >
                  {isCurrentPlan ? "Current Plan" : plan.id === "free" ? "Your Default Plan" : "Coming Soon"}
                </button>
              </div>
            );
          })}
        </div>

        <div style={styles.trustRow}>
          {["🔒 Secure Payment", "↩️ Cancel Anytime", "💳 No Hidden Fees"].map((t, i) => (
            <div key={i} style={styles.trustBadge}>{t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0d0d12", color: "#fff", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden", paddingTop: 90 },
  bgOrbs: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 },
  orb: { position: "absolute", borderRadius: "50%", filter: "blur(60px)" },
  container: { position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "40px 20px 80px" },
  header: { display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 40 },
  backBtn: { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 12, width: 44, height: 44, fontSize: 18, cursor: "pointer", flexShrink: 0, marginTop: 4 },
  headerText: { flex: 1 },
  eyebrow: { fontSize: 11, letterSpacing: 3, color: "#f59e0b", fontWeight: 700, margin: "0 0 8px" },
  title: { fontSize: 36, fontWeight: 800, margin: "0 0 8px", background: "linear-gradient(135deg, #fff 0%, #9ca3af 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  subtitle: { color: "#9ca3af", fontSize: 16, margin: 0 },
  errorBanner: { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px 20px", marginBottom: 24, color: "#fca5a5", fontSize: 14 },
  toggleWrapper: { display: "flex", justifyContent: "center", marginBottom: 48 },
  toggle: { display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 50, padding: 4, gap: 4, border: "1px solid rgba(255,255,255,0.08)" },
  toggleBtn: { padding: "10px 28px", borderRadius: 50, border: "none", background: "transparent", color: "#9ca3af", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 },
  toggleActive: { background: "#fff", color: "#0d0d12" },
  saveBadge: { background: "#16a34a", color: "#fff", borderRadius: 50, padding: "2px 8px", fontSize: 11, fontWeight: 700 },
  plansGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, alignItems: "center", marginBottom: 48 },
  planCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: 28, position: "relative" },
  planCardFeatured: { border: "1px solid rgba(139,92,246,0.4)", background: "rgba(139,92,246,0.06)" },
  planBadge: { position: "absolute", top: -12, right: 20, borderRadius: 50, padding: "4px 16px", fontSize: 12, fontWeight: 700, color: "#fff" },
  planHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  planIconWrapper: { position: "relative", width: 48, height: 48 },
  planIconBg: { position: "absolute", inset: 0, borderRadius: 14, opacity: 0.2 },
  planIcon: { position: "relative", zIndex: 1, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", textAlign: "center", lineHeight: "48px" },
  planName: { fontSize: 24, fontWeight: 800, margin: 0 },
  priceBlock: { marginBottom: 24, minHeight: 64 },
  freeLabel: { fontSize: 22, fontWeight: 700, color: "#6b7280", paddingTop: 8 },
  priceRow: { display: "flex", alignItems: "baseline", gap: 4 },
  currency: { fontSize: 20, fontWeight: 600, color: "#9ca3af", alignSelf: "flex-start", marginTop: 6 },
  price: { fontSize: 52, fontWeight: 900, lineHeight: 1 },
  period: { fontSize: 16, color: "#9ca3af" },
  savingText: { fontSize: 13, color: "#16a34a", fontWeight: 600, marginTop: 4 },
  billedText: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  featureList: { listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 10 },
  featureItem: { display: "flex", alignItems: "center", gap: 10 },
  featureIcon: { fontWeight: 800, fontSize: 14, width: 18, flexShrink: 0 },
  featureLabel: { fontSize: 14, color: "#d1d5db" },
  ctaBtn: { width: "100%", padding: "14px 0", borderRadius: 14, border: "none", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", letterSpacing: 0.5 },
  trustRow: { display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" },
  trustBadge: { fontSize: 13, color: "#6b7280", display: "flex", alignItems: "center", gap: 6 },
};