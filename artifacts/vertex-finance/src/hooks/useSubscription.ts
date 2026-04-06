import { useState, useEffect } from "react";

export type Plan = "free" | "pro" | "premium";

export interface SubscriptionState {
  plan: Plan;
  loading: boolean;
  subscription: any | null;
  refetch: () => void;
}

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

let cachedPlan: Plan | null = null;
let cacheTs = 0;
const CACHE_TTL = 60_000;

export function useSubscription(): SubscriptionState {
  const [plan, setPlan] = useState<Plan>(cachedPlan ?? "free");
  const [loading, setLoading] = useState(!cachedPlan);
  const [subscription, setSubscription] = useState<any | null>(null);

  async function fetchSubscription() {
    if (cachedPlan && Date.now() - cacheTs < CACHE_TTL) {
      setPlan(cachedPlan);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/stripe/subscription`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const p: Plan = data.plan || "free";
        cachedPlan = p;
        cacheTs = Date.now();
        setPlan(p);
        setSubscription(data.subscription);
      }
    } catch {
      // no-op: stay on free
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSubscription();
  }, []);

  return { plan, loading, subscription, refetch: fetchSubscription };
}

export function planLabel(plan: Plan): string {
  if (plan === "premium") return "Premium";
  if (plan === "pro") return "Pro";
  return "Free";
}

export function planColor(plan: Plan): string {
  if (plan === "premium") return "text-amber-400";
  if (plan === "pro") return "text-indigo-400";
  return "text-neutral-400";
}

export function planBgColor(plan: Plan): string {
  if (plan === "premium") return "bg-amber-500/15 border-amber-500/30";
  if (plan === "pro") return "bg-indigo-500/15 border-indigo-500/30";
  return "bg-neutral-500/10 border-neutral-600/30";
}
