import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getBillingStatus } from "@/lib/billing";
import { getInsforgeServerClient } from "@/lib/insforge-server";
import { getPlan, isPlanId } from "@/lib/plans";

const RAZORPAY_ENVIRONMENT = process.env.RAZORPAY_ENVIRONMENT === "live" ? "live" : "test";

function planProviderId(plan: string) {
  const key = `RAZORPAY_PLAN_${plan.toUpperCase()}`;
  return process.env[key];
}

export async function POST(request: NextRequest) {
  try {
    const billing = await getBillingStatus();
    if (!billing.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json() as { plan?: unknown };
    if (!isPlanId(body.plan)) return NextResponse.json({ error: "Choose a valid monthly plan" }, { status: 400 });
    const providerPlanId = planProviderId(body.plan);
    if (!providerPlanId) return NextResponse.json({ error: "This plan is not ready for checkout yet. Please try again shortly." }, { status: 503 });

    const plan = getPlan(body.plan)!;
    const { insforge } = await getInsforgeServerClient();
    const { data: internalOrder, error: orderError } = await insforge.database.from("billing_orders").insert([{
      user_id: billing.userId, plan: body.plan, amount: plan.price * 100, currency: "INR", status: "pending", billing_interval: "month",
    }]).select("id").single();
    if (orderError || !internalOrder) return NextResponse.json({ error: "Billing storage is not ready. Apply the recurring billing migration first." }, { status: 503 });

    const user = await currentUser();
    const { data, error } = await insforge.payments.razorpay.createSubscription(RAZORPAY_ENVIRONMENT, {
      planId: providerPlanId,
      totalCount: 120,
      subject: { type: "user", id: billing.userId },
      customerName: user?.fullName ?? null,
      customerEmail: user?.primaryEmailAddress?.emailAddress ?? null,
      notes: { internal_order_id: internalOrder.id, plan: body.plan },
    } as never);
    if (error || !data) {
      await insforge.database.from("billing_orders").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", internalOrder.id).eq("user_id", billing.userId);
      return NextResponse.json({ error: "Subscriptions are not configured yet. Please try again shortly." }, { status: 503 });
    }
    const subscription = data as unknown as { subscription?: { subscriptionId?: string }; checkoutOptions: Record<string, unknown> };
    const providerSubscriptionId = subscription.subscription?.subscriptionId ?? subscription.checkoutOptions.subscription_id;
    if (!providerSubscriptionId) return NextResponse.json({ error: "Unable to prepare recurring checkout" }, { status: 502 });
    await insforge.database.from("billing_orders").update({ provider_subscription_id: providerSubscriptionId, updated_at: new Date().toISOString() }).eq("id", internalOrder.id).eq("user_id", billing.userId);
    return NextResponse.json({ checkoutOptions: subscription.checkoutOptions });
  } catch (error) {
    console.error("Unable to start Razorpay subscription", error);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
  }
}
