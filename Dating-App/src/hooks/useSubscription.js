// src/hooks/useSubscription.js — Supabase version
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const PLAN_FEATURES = {
  free: {
    dailyLikes: 5,
    canSeeWhoLiked: false,
    incognito: false,
    boostsPerWeek: 0,
    translationsPerDay: 10,
    unlimitedTranslation: false,
    priorityMatching: false,
    readReceipts: false,
    videoFeatured: false,
    badge: null,
  },
  gold: {
    dailyLikes: Infinity,
    canSeeWhoLiked: true,
    incognito: true,
    boostsPerWeek: 1,
    translationsPerDay: 50,
    unlimitedTranslation: false,
    priorityMatching: false,
    readReceipts: false,
    videoFeatured: false,
    badge: "gold",
  },
  platinum: {
    dailyLikes: Infinity,
    canSeeWhoLiked: true,
    incognito: true,
    boostsPerWeek: 3,
    translationsPerDay: Infinity,
    unlimitedTranslation: true,
    priorityMatching: true,
    readReceipts: true,
    videoFeatured: true,
    badge: "platinum",
  },
};

export function useSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [currentPlan, setCurrentPlan] = useState("free");
  const [features, setFeatures] = useState(PLAN_FEATURES.free);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCurrentPlan("free");
        setFeatures(PLAN_FEATURES.free);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("user_subscriptions")
        .select(`
          id, status, billing_interval, amount_paid, currency,
          current_period_end, cancel_at_period_end,
          subscription_plans ( name )
        `)
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due", "cancelling"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (queryError) throw queryError;

      if (!data) {
        setCurrentPlan("free");
        setFeatures(PLAN_FEATURES.free);
        setSubscription(null);
        return;
      }

      const planName = data.subscription_plans?.name?.toLowerCase() || "free";
      setSubscription(data);
      setCurrentPlan(planName);
      setFeatures(PLAN_FEATURES[planName] || PLAN_FEATURES.free);
    } catch (err) {
      console.error("useSubscription:", err);
      setError(err.message);
      setCurrentPlan("free");
      setFeatures(PLAN_FEATURES.free);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscription();

    const channel = supabase
      .channel("subscription-changes")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "user_subscriptions",
      }, () => loadSubscription())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [loadSubscription]);

  // Initiate checkout
  const subscribe = useCallback(async (planId, billing = "monthly") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const res = await fetch(`${API_BASE}/api/subscription/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ plan: planId, billing }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Checkout failed");
    }

    const { checkoutUrl, sessionId } = await res.json();
    return { checkoutUrl, sessionId };
  }, []);

  // Cancel subscription
  const cancelSubscription = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const res = await fetch(`${API_BASE}/api/subscription/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) throw new Error("Cancel failed");
    await loadSubscription();
  }, [loadSubscription]);

  const hasFeature = useCallback(
    (featureKey) => {
      const val = features[featureKey];
      return val === true || val === Infinity || (typeof val === "number" && val > 0);
    },
    [features]
  );

  const canUse = useCallback(
    (featureKey, currentCount = 0) => {
      const limit = features[featureKey];
      if (limit === Infinity) return true;
      if (typeof limit === "number") return currentCount < limit;
      return !!limit;
    },
    [features]
  );

  return {
    subscription,
    currentPlan,
    features,
    loading,
    error,
    subscribe,
    cancelSubscription,
    hasFeature,
    canUse,
    reload: loadSubscription,
    isPremium: currentPlan !== "free",
    isPlatinum: currentPlan === "platinum",
    isGold: currentPlan === "gold",
    PLAN_FEATURES,
  };
}