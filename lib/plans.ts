export const PLAN_CATALOG = {
  starter: {
    name: "Starter",
    price: 99,
    quota: 10,
    features: ["10 AI generations per month", "Ideas workspace", "Draft posts"],
  },
  creator: {
    name: "Creator",
    price: 299,
    quota: 60,
    features: ["60 AI generations per month", "Content scheduling", "Basic analytics"],
  },
  growth: {
    name: "Growth",
    price: 699,
    quota: 200,
    features: ["200 AI generations per month", "Viral Content Suggestor", "Priority generation", "Up to 3 team seats"],
  },
} as const;

export type PlanId = keyof typeof PLAN_CATALOG;

export const PLAN_IDS = Object.keys(PLAN_CATALOG) as PlanId[];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && PLAN_IDS.includes(value as PlanId);
}

export function getPlan(plan: string | null | undefined) {
  return plan && isPlanId(plan) ? PLAN_CATALOG[plan] : null;
}
