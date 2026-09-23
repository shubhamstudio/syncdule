import "server-only";

import { auth } from "@clerk/nextjs/server";
import { getInsforgeAdminClient } from "@/lib/insforge-server";
import { getPlan, type PlanId } from "@/lib/plans";

export type BillingStatus = {
  userId: string | null;
  canUseAI: boolean;
  plan: PlanId | null;
  source: "clerk" | "razorpay" | "none";
  billingConfigured: boolean;
  quota: { used: number; limit: number; remaining: number; renewsAt: string | null };
  providerSubscriptionId: string | null;
};

type Entitlement = {
  plan: string;
  expires_at: string | null;
  ai_quota: number | null;
  cycle_started_at: string | null;
  renews_at: string | null;
  provider_subscription_id: string | null;
};

/** Returns app-owned billing state; provider tables are never exposed. */
export async function getBillingStatus(): Promise<BillingStatus> {
  const { has, userId } = await auth();
  const empty = { used: 0, limit: 0, remaining: 0, renewsAt: null };
  if (!userId) return { userId: null, canUseAI: false, plan: null, source: "none", billingConfigured: false, quota: empty, providerSubscriptionId: null };

  // Existing Clerk subscriptions remain supported while they migrate to the
  // app-owned catalog. There is deliberately no lifetime/forever mapping.
  const clerkPlan = (["growth", "business", "creator", "premium", "starter", "pro"] as const).find((plan) => has({ plan }));
  if (clerkPlan) {
    const plan: PlanId = clerkPlan === "growth" || clerkPlan === "business" ? "growth" : clerkPlan === "creator" || clerkPlan === "premium" || clerkPlan === "pro" ? "creator" : "starter";
    const details = getPlan(plan)!;
    return { userId, canUseAI: true, plan, source: "clerk", billingConfigured: true, quota: { used: 0, limit: details.quota, remaining: details.quota, renewsAt: null }, providerSubscriptionId: null };
  }

  // This request has already been authenticated by Clerk above. Keep the user
  // filter on every query and avoid requiring InsForge to validate a second
  // Clerk JWT template before the schedule can be created.
  const insforge = getInsforgeAdminClient();
  const { data, error } = await insforge.database.from("user_entitlements")
    .select("plan, expires_at, ai_quota, cycle_started_at, renews_at, provider_subscription_id")
    .eq("user_id", userId).eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle();

  if (error || !data || !getPlan(data.plan)) {
    return { userId, canUseAI: false, plan: null, source: "none", billingConfigured: !error, quota: empty, providerSubscriptionId: null };
  }

  const entitlement = data as Entitlement;
  const plan = entitlement.plan as PlanId;
  const expired = entitlement.expires_at !== null && new Date(entitlement.expires_at) <= new Date();
  const { count, error: usageError } = await insforge.database.from("ai_usage_events")
    .select("id", { count: "exact", head: true }).eq("user_id", userId)
    .gte("created_at", entitlement.cycle_started_at ?? new Date().toISOString());
  const used = usageError ? 0 : count ?? 0;
  const limit = entitlement.ai_quota ?? getPlan(plan)!.quota;
  const remaining = Math.max(0, limit - used);

  return {
    userId, plan, source: "razorpay", billingConfigured: !usageError,
    canUseAI: !expired && remaining > 0,
    quota: { used, limit, remaining, renewsAt: entitlement.renews_at },
    providerSubscriptionId: entitlement.provider_subscription_id,
  };
}

/** Consume one generation immediately before calling the model. */
export async function consumeAiQuota(feature: "ideas" | "post-copy" | "viral-suggestor") {
  const billing = await getBillingStatus();
  if (!billing.userId || !billing.plan) return { allowed: false, billing };
  if (billing.source === "clerk") return { allowed: true, billing };

  // getBillingStatus authenticated the caller with Clerk and returned the
  // scoped user ID above. The quota RPC uses that authenticated database
  // function, so it must not depend on an optional Clerk JWT template.
  const insforge = getInsforgeAdminClient();
  const { data, error } = await insforge.database.rpc("consume_ai_quota", { p_feature: feature });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row?.allowed) return { allowed: false, billing };
  return { allowed: true, billing: { ...billing, quota: { used: row.used, limit: row.quota, remaining: Math.max(0, row.quota - row.used), renewsAt: row.renews_at } } };
}

export async function hasAiAccess(): Promise<boolean> {
  return (await getBillingStatus()).canUseAI;
}
