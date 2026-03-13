import { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useSubscription } from "../hooks/useSubscription";
import { supabase } from "../lib/supabaseClient";

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { subscribe, reload } = useSubscription();

  const [status, setStatus] = useState("loading"); // loading | success | failed | redirecting
  const [error, setError] = useState(null);

  const plan = location.state?.plan;
  const billing = location.state?.billing || "monthly";

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const cancelled = searchParams.get("cancelled");

    if (sessionId) {
      // Returned from Stripe — verify payment
      verifyPayment(sessionId);
    } else if (cancelled) {
      setStatus("failed");
      setError("Payment was cancelled.");
    } else if (plan) {
      // First visit — initiate Stripe checkout
      initiateCheckout();
    } else {
      navigate("/subscription");
    }
  }, []);

  const initiateCheckout = async () => {
    setStatus("redirecting");
    try {
      const { checkoutUrl } = await subscribe(plan.id, billing);
      window.location.href = checkoutUrl;
    } catch (err) {
      setStatus("failed");
      setError(err.message);
    }
  };

  const verifyPayment = async (sessionId) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/subscription/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ sessionId }),
        }
      );

      if (!res.ok) throw new Error("Verification failed");

      await reload();
      setStatus("success");

      setTimeout(() => navigate("/discover"), 3000);
    } catch (err) {
      setStatus("failed");
      setError(err.message);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {status === "loading" || status === "redirecting" ? (
          <div style={styles.center}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>
              {status === "redirecting" ? "Redirecting to payment..." : "Processing..."}
            </p>
          </div>
        ) : status === "success" ? (
          <div style={styles.center}>
            <div style={styles.successIcon}>🎉</div>
            <h2 style={styles.successTitle}>Payment Successful!</h2>
            <p style={styles.successText}>
              Welcome to your new plan. Redirecting you to Discover...
            </p>
            <div style={styles.progressBar}>
              <div style={styles.progressFill} />
            </div>
          </div>
        ) : (
          <div style={styles.center}>
            <div style={styles.failIcon}>❌</div>
            <h2 style={styles.failTitle}>Payment Failed</h2>
            <p style={styles.failText}>{error || "Something went wrong."}</p>
            <div style={styles.btnRow}>
              <button onClick={() => navigate("/subscription")} style={styles.retryBtn}>
                Try Again
              </button>
              <button onClick={() => navigate("/discover")} style={styles.skipBtn}>
                Back to App
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "#0d0d12", fontFamily: "'DM Sans', sans-serif",
  },
  card: {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24, padding: 48, maxWidth: 400, width: "90%", textAlign: "center",
  },
  center: { display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
  spinner: {
    width: 48, height: 48, border: "3px solid rgba(255,255,255,0.1)",
    borderTop: "3px solid #f59e0b", borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: { color: "#9ca3af", fontSize: 16 },
  successIcon: { fontSize: 64 },
  successTitle: { color: "#fff", fontSize: 28, fontWeight: 800, margin: 0 },
  successText: { color: "#9ca3af", fontSize: 15, margin: 0 },
  progressBar: {
    width: "100%", height: 4, background: "rgba(255,255,255,0.1)",
    borderRadius: 50, overflow: "hidden", marginTop: 8,
  },
  progressFill: {
    height: "100%", background: "linear-gradient(90deg, #f59e0b, #8b5cf6)",
    borderRadius: 50, animation: "progress 3s linear forwards",
    "@keyframes progress": { from: { width: "0%" }, to: { width: "100%" } },
  },
  failIcon: { fontSize: 56 },
  failTitle: { color: "#fff", fontSize: 24, fontWeight: 800, margin: 0 },
  failText: { color: "#9ca3af", fontSize: 15, margin: 0 },
  btnRow: { display: "flex", gap: 12, marginTop: 8 },
  retryBtn: {
    padding: "12px 24px", background: "linear-gradient(135deg, #f59e0b, #d97706)",
    border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 15,
  },
  skipBtn: {
    padding: "12px 24px", background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#9ca3af",
    fontWeight: 600, cursor: "pointer", fontSize: 15,
  },
};