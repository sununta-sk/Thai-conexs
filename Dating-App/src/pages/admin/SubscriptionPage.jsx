import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../../hooks/useSubscription";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: { monthly: 0, yearly: 0 },
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
    price: { monthly: 299, yearly: 2388 },
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
    price: { monthly: 599, yearly: 4788 },
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

export default function SubscriptionPage() {
  const [billing, setBilling] = useState("monthly");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const { currentPlan, subscribe } = useSubscription();
  const navigate = useNavigate();

  const handleSubscribe = async (plan) => {
    if (plan.id === "free") return;
    setSelectedPlan(plan.id);
    setLoading(true);
    setErrorMsg(null);
    try {
      const { checkoutUrl } = await subscribe(plan.id, billing);
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong");
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const getYearlySaving = (plan) => {
    if (!plan.price.monthly) return 0;
    return plan.price.monthly * 12 - plan.price.yearly;
  };

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

        {errorMsg && (
          <div style={styles.errorBanner}>⚠️ {errorMsg}</div>
        )}

        <div style={styles.toggleWrapper}>
          <div style={styles.toggle}>
            <button
              style={{ ...styles.toggleBtn, ...(billing === "monthly" ? styles.toggleActive : {}) }}
              onClick={() => setBilling("monthly")}
            >Monthly</button>
            <button
              style={{ ...styles.toggleBtn, ...(billing === "yearly" ? styles.toggleActive : {}) }}
              onClick={() => setBilling("yearly")}
            >
              Yearly
              <span style={styles.saveBadge}>Save 33%</span>
            </button>
          </div>
        </div>

        <div style={styles.plansGrid}>
          {PLANS.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            const price = billing === "monthly" ? plan.price.monthly : Math.round(plan.price.yearly / 12);
            const saving = getYearlySaving(plan);
            const isPlatinum = plan.id === "platinum";
            const isLoading = loading && selectedPlan === plan.id;

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

                <div style={styles.priceBlock}>
                  {plan.price.monthly === 0 ? (
                    <div style={styles.freeLabel}>Free Forever</div>
                  ) : (
                    <>
                      <div style={styles.priceRow}>
                        <span style={styles.currency}>฿</span>
                        <span style={{ ...styles.price, color: plan.color }}>{price}</span>
                        <span style={styles.period}>/mo</span>
                      </div>
                      {billing === "yearly" && saving > 0 && (
                        <div style={styles.savingText}>Save ฿{saving}/year</div>
                      )}
                      {billing === "yearly" && (
                        <div style={styles.billedText}>Billed ฿{plan.price.yearly}/year</div>
                      )}
                    </>
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
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrentPlan || isLoading || plan.id === "free"}
                  style={{
                    ...styles.ctaBtn,
                    background: isCurrentPlan ? "#374151" : plan.gradient,
                    opacity: plan.id === "free" ? 0.5 : 1,
                    cursor: plan.id === "free" || isCurrentPlan ? "default" : "pointer",
                  }}
                >
                  {isLoading ? "⏳ Loading..." : isCurrentPlan ? "Current Plan" : plan.id === "free" ? "Your Default Plan" : `Get ${plan.name}`}
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
  page: { minHeight: "100vh", background: "#0d0d12", color: "#fff", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" },
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