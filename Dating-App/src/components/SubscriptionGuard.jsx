// src/components/SubscriptionGuard.jsx
// ─────────────────────────────────────────────────────────
// Wrap any feature with this to gate access by plan tier
//
// Usage:
//   <SubscriptionGuard feature="incognito" requiredPlan="gold">
//     <IncognitoToggle />
//   </SubscriptionGuard>

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../hooks/useSubscription";

const FEATURE_LABELS = {
  incognito: { label: "Incognito Mode", icon: "🕵️" },
  canSeeWhoLiked: { label: "See Who Liked You", icon: "💖" },
  unlimitedTranslation: { label: "Unlimited Translation", icon: "🌐" },
  priorityMatching: { label: "Priority Matching", icon: "⚡" },
  readReceipts: { label: "Read Receipts", icon: "✓✓" },
  videoFeatured: { label: "Featured Video Profile", icon: "🎬" },
  boostsPerWeek: { label: "Profile Boost", icon: "🚀" },
};

const PLAN_GRADIENTS = {
  gold: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  platinum: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
};

export function SubscriptionGuard({ children, feature, requiredPlan = "gold" }) {
  const { hasFeature } = useSubscription();
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  if (hasFeature(feature)) {
    return children;
  }

  const meta = FEATURE_LABELS[feature] || { label: feature, icon: "⭐" };

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        style={{ position: "relative", cursor: "pointer" }}
      >
        {/* Blur the feature */}
        <div style={{ pointerEvents: "none", filter: "blur(2px)", opacity: 0.4 }}>
          {children}
        </div>
        {/* Lock overlay */}
        <div style={lockStyles.overlay}>
          <span style={lockStyles.lockIcon}>🔒</span>
          <span style={lockStyles.lockText}>{requiredPlan.toUpperCase()}</span>
        </div>
      </div>

      {showModal && (
        <UpgradeModal
          feature={meta}
          requiredPlan={requiredPlan}
          onClose={() => setShowModal(false)}
          onUpgrade={() => navigate("/subscription")}
        />
      )}
    </>
  );
}

function UpgradeModal({ feature, requiredPlan, onClose, onUpgrade }) {
  return (
    <div style={modalStyles.backdrop} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            ...modalStyles.iconWrapper,
            background: PLAN_GRADIENTS[requiredPlan] || PLAN_GRADIENTS.gold,
          }}
        >
          <span style={{ fontSize: 36 }}>{feature.icon}</span>
        </div>

        <h3 style={modalStyles.title}>{feature.label}</h3>
        <p style={modalStyles.desc}>
          Unlock <strong>{feature.label}</strong> and more with{" "}
          <span style={{ color: requiredPlan === "platinum" ? "#8b5cf6" : "#f59e0b", fontWeight: 700 }}>
            {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}
          </span>{" "}
          plan.
        </p>

        <button
          onClick={onUpgrade}
          style={{
            ...modalStyles.upgradeBtn,
            background: PLAN_GRADIENTS[requiredPlan] || PLAN_GRADIENTS.gold,
          }}
        >
          Upgrade to {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}
        </button>
        <button onClick={onClose} style={modalStyles.closeBtn}>
          Maybe later
        </button>
      </div>
    </div>
  );
}

// ── PlanBadge ──────────────────────────────────────────────────────────────────
// Small inline badge shown next to username
export function PlanBadge({ plan, size = "sm" }) {
  if (!plan || plan === "free") return null;

  const cfg = {
    gold:     { icon: "✨", label: "Gold",     bg: "linear-gradient(135deg, #f59e0b, #d97706)" },
    platinum: { icon: "💎", label: "Platinum", bg: "linear-gradient(135deg, #8b5cf6, #6d28d9)" },
  };

  const p = cfg[plan];
  if (!p) return null;

  const isLg = size === "lg";

  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: p.bg, borderRadius: 50,
        padding: isLg ? "4px 12px" : "2px 8px",
        fontSize: isLg ? 13 : 10, fontWeight: 700, color: "#fff",
        letterSpacing: 0.3,
      }}
    >
      {p.icon} {p.label}
    </span>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const lockStyles = {
  overlay: {
    position: "absolute", inset: 0, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  lockIcon: { fontSize: 24 },
  lockText: {
    background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)",
    color: "#f59e0b", borderRadius: 50, padding: "2px 10px",
    fontSize: 10, fontWeight: 800, letterSpacing: 1,
  },
};

const modalStyles = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999, backdropFilter: "blur(6px)",
  },
  modal: {
    background: "#161620", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 24, padding: 36, maxWidth: 360, width: "90%",
    textAlign: "center", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 16,
  },
  iconWrapper: {
    width: 80, height: 80, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  title: { color: "#fff", fontSize: 22, fontWeight: 800, margin: 0 },
  desc: { color: "#9ca3af", fontSize: 15, margin: 0, lineHeight: 1.6 },
  upgradeBtn: {
    width: "100%", padding: "14px 0", border: "none", borderRadius: 14,
    color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer",
  },
  closeBtn: {
    background: "transparent", border: "none", color: "#6b7280",
    fontSize: 14, cursor: "pointer", padding: "4px 0",
  },
};