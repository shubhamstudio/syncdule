import { NextResponse } from "next/server";
import { getBillingStatus } from "@/lib/billing";
import { getInsforgeServerClient } from "@/lib/insforge-server";

export async function GET() {
  try {
    const status = await getBillingStatus();
    if (!status.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { insforge } = await getInsforgeServerClient();
    const { data: orders, error } = await insforge.database
      .from("billing_orders")
      .select("id, plan, amount, currency, status, created_at")
      .eq("user_id", status.userId)
      .order("created_at", { ascending: false })
      .limit(12);

    return NextResponse.json({
      ...status,
      billingConfigured: status.billingConfigured && !error,
      latestOrder: error ? null : orders?.[0] ?? null,
      invoices: error ? [] : (orders ?? []).filter((order) => order.status === "paid" || order.status === "verification_pending"),
    });
  } catch (error) {
    console.error("Unable to load billing status", error);
    return NextResponse.json({ error: "Unable to load billing status" }, { status: 500 });
  }
}
