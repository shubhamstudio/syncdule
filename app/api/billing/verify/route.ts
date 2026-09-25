import { NextRequest, NextResponse } from "next/server";
import { getBillingStatus } from "@/lib/billing";
import { getInsforgeServerClient } from "@/lib/insforge-server";
import { getAuthenticatedInsforgeAdminClient } from "@/lib/server/insforge-admin";

const RAZORPAY_ENVIRONMENT = process.env.RAZORPAY_ENVIRONMENT === "live" ? "live" : "test";

export async function POST(request: NextRequest) {
  try {
    const billing = await getBillingStatus();
    if (!billing.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { subscriptionId, paymentId, signature } = await request.json();
    if (![subscriptionId, paymentId, signature].every((value) => typeof value === "string" && value.trim())) {
      return NextResponse.json({ error: "Invalid payment verification payload" }, { status: 400 });
    }

    const { insforge: admin, userId } = await getAuthenticatedInsforgeAdminClient();
    if (!admin || userId !== billing.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { insforge: payments, userId: paymentUserId } = await getInsforgeServerClient();
    if (paymentUserId !== billing.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: internalOrder, error: orderError } = await admin.database
      .from("billing_orders")
      .select("id")
      .eq("user_id", billing.userId)
      .eq("provider_subscription_id", subscriptionId)
      .single();
    if (orderError || !internalOrder) return NextResponse.json({ error: "Subscription record not found" }, { status: 404 });

    const { data, error } = await payments.payments.razorpay.verifySubscription(
      RAZORPAY_ENVIRONMENT,
      { subscriptionId, paymentId, signature },
    );
    if (error || !data?.verified) return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });

    await admin.database
      .from("billing_orders")
      .update({ status: "verification_pending", updated_at: new Date().toISOString() })
      .eq("id", internalOrder.id)
      .eq("user_id", billing.userId);

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error("Unable to verify Razorpay subscription", error);
    return NextResponse.json({ error: "Unable to verify payment" }, { status: 500 });
  }
}
