import { NextResponse } from "next/server";
import { getBillingStatus } from "@/lib/billing";
import { getInsforgeServerClient } from "@/lib/insforge-server";

const RAZORPAY_ENVIRONMENT = process.env.RAZORPAY_ENVIRONMENT === "live" ? "live" : "test";

/** Schedules cancellation at the end of the paid billing period. */
export async function POST() {
  try {
    const billing = await getBillingStatus();
    if (!billing.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (billing.source !== "razorpay" || !billing.providerSubscriptionId) {
      return NextResponse.json({ error: "There is no active monthly plan to manage." }, { status: 400 });
    }

    const { insforge, userId } = await getInsforgeServerClient();
    if (userId !== billing.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await insforge.payments.razorpay.cancelSubscription(
      RAZORPAY_ENVIRONMENT,
      billing.providerSubscriptionId,
      { cancelAtCycleEnd: true },
    );

    if (error) return NextResponse.json({ error: "Unable to schedule plan cancellation. Please try again." }, { status: 502 });
    return NextResponse.json({ cancelledAtCycleEnd: true });
  } catch (error) {
    console.error("Unable to cancel subscription", error);
    return NextResponse.json({ error: "Unable to manage your plan right now." }, { status: 500 });
  }
}
