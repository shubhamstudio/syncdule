"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CalendarClock,
  Check,
  CreditCard,
  Gauge,
  History,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { PLAN_CATALOG, type PlanId } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { MetricTile, PageHeader, StatusChip } from "@/components/workspace-ui";
import { APP_NAME } from "@/constants/app";

type Invoice = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
};

type BillingStatus = {
  canUseAI: boolean;
  plan: PlanId | null;
  source?: "clerk" | "razorpay" | "none";
  providerSubscriptionId?: string | null;
  billingConfigured: boolean;
  quota: {
    used: number;
    limit: number;
    remaining: number;
    renewsAt: string | null;
  };
  latestOrder: {
    plan: string;
    amount: number;
    status: string;
    created_at: string;
  } | null;
  invoices: Invoice[];
};

type CheckoutOptions = Record<string, unknown> & {
  subscription_id?: string;
  order_id?: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load secure checkout"));
    document.body.appendChild(script);
  });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export default function BillingPanel() {
  const client = useQueryClient();
  const [verifying, setVerifying] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const status = useQuery({
    queryKey: ["billing-status"],
    queryFn: async () => {
      const response = await fetch("/api/billing/status");
      const body = (await response.json()) as BillingStatus & { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to load billing");
      return body;
    },
  });

  const checkout = useMutation({
    mutationFn: async (plan: PlanId) => {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const body = (await response.json()) as { checkoutOptions?: CheckoutOptions; error?: string };
      if (!response.ok || !body.checkoutOptions) {
        throw new Error(body.error || "Unable to start checkout");
      }
      return body.checkoutOptions;
    },
    onSuccess: async (options) => {
      try {
        await loadCheckout();
        if (!window.Razorpay) throw new Error("Secure checkout is unavailable");

        new window.Razorpay({
          ...options,
          name: APP_NAME,
          description: "Monthly creator plan",
          theme: { color: "#f97316", backdrop_color: "#09090b" },
          handler: async (response: {
            razorpay_subscription_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            setVerifying(true);
            try {
              const verify = await fetch("/api/billing/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  subscriptionId: response.razorpay_subscription_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                }),
              });
              if (!verify.ok) {
                throw new Error(
                  ((await verify.json()) as { error?: string }).error || "Payment verification failed",
                );
              }
              toast.success("Payment verified. Your plan will update once confirmation is complete.");
              await client.invalidateQueries({ queryKey: ["billing-status"] });
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Payment verification failed");
            } finally {
              setVerifying(false);
            }
          },
        }).open();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to open checkout");
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelPlan = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/billing/cancel", { method: "POST" });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to manage your plan");
    },
    onSuccess: async () => {
      setManageOpen(false);
      toast.success("Your plan will end after the current billing period.");
      await client.invalidateQueries({ queryKey: ["billing-status"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const billing = status.data;
  const hasManageablePlan = billing?.source === "razorpay" && Boolean(billing.providerSubscriptionId);
  const hasActivePlan = Boolean(billing?.plan);
  const usagePercent = billing?.quota.limit
    ? Math.min(100, (billing.quota.used / billing.quota.limit) * 100)
    : 0;
  const renewal = formatDate(billing?.quota.renewsAt ?? null);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader
        eyebrow="Plans & usage"
        title="Flexible monthly plans"
        description="AI generations reset each billing cycle. Change plans any time; completed payment webhooks are the source of truth."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
              <History className="size-4" />
              Payment history
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasActivePlan}
              onClick={() => setManageOpen(true)}
              title={hasActivePlan ? "View plan options" : "An active monthly plan is required"}
            >
              <Settings2 className="size-4" />
              Manage plan
            </Button>
            <Button variant="outline" size="sm" onClick={() => void status.refetch()} disabled={status.isFetching}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="my-5 grid gap-3 sm:grid-cols-3">
        <MetricTile
          label="Current plan"
          value={billing?.plan ? PLAN_CATALOG[billing.plan].name : "No plan"}
          detail={billing?.plan ? "Recurring monthly" : "Select a plan to start"}
          icon={BadgeCheck}
        />
        <MetricTile
          label="AI generations"
          value={billing ? `${billing.quota.used}/${billing.quota.limit}` : "—"}
          detail={billing?.quota.limit ? `${billing.quota.remaining} remaining this cycle` : "Quota appears after activation"}
          icon={Gauge}
        />
        <MetricTile
          label="Next renewal"
          value={billing?.quota.renewsAt ? renewal : "—"}
          detail={billing?.quota.renewsAt ? "Quota resets on renewal" : "No active cycle"}
          icon={CalendarClock}
        />
      </div>

      {billing?.quota.limit ? (
        <Card variant="panel" className="mb-5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">Monthly AI usage</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {billing.quota.used} of {billing.quota.limit} generations used · resets {renewal}
              </p>
            </div>
            <StatusChip tone={billing.quota.remaining <= 2 ? "warning" : "success"}>
              {billing.quota.remaining} left
            </StatusChip>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${usagePercent}%` }} />
          </div>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {(Object.entries(PLAN_CATALOG) as [PlanId, (typeof PLAN_CATALOG)[PlanId]][]).map(([id, plan]) => {
          const current = billing?.plan === id;
          const isDowngrade = billing?.plan && plan.price < PLAN_CATALOG[billing.plan].price;

          return (
            <Card key={id} variant="panel" className="flex min-w-0 flex-col rounded-xl">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{plan.name}</CardTitle>
                  {current ? <StatusChip tone="success">Current plan</StatusChip> : null}
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  ₹{plan.price}<span className="text-sm font-normal text-muted-foreground"> / month</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{plan.quota} AI generations per monthly cycle</p>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={current ? "outline" : "default"}
                  disabled={current || checkout.isPending || verifying || !billing?.billingConfigured}
                  onClick={() => checkout.mutate(id)}
                >
                  {checkout.isPending || verifying ? <Spinner /> : <CreditCard className="size-4" />}
                  {current ? "Current plan" : isDowngrade ? "Switch to this plan" : "Choose plan"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </section>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent
          overlayClassName="bg-black/65 supports-backdrop-filter:backdrop-blur-md"
          className="max-w-2xl border-white/10 bg-[#111114] p-0 sm:max-w-2xl"
        >
          <DialogHeader className="border-b border-white/10 px-5 py-4 sm:px-6">
            <DialogTitle>Payment history</DialogTitle>
            <DialogDescription>Completed payments and their current status.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {billing?.invoices?.length ? (
              <div className="divide-y divide-white/10">
                {billing.invoices.map((invoice) => (
                  <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm sm:px-6">
                    <div>
                      <p className="font-medium">₹{invoice.amount / 100}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(invoice.created_at)}</p>
                    </div>
                    <StatusChip tone={invoice.status === "paid" ? "success" : "default"}>
                      {invoice.status.replace(/_/g, " ")}
                    </StatusChip>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-12 text-center text-sm text-muted-foreground sm:px-6">
                No payments yet. Completed payments will appear here.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent
          overlayClassName="bg-black/65 supports-backdrop-filter:backdrop-blur-md"
          className="max-w-md border-white/10 bg-[#111114]"
        >
          <DialogHeader>
            <DialogTitle>Manage your plan</DialogTitle>
            <DialogDescription>
              {hasManageablePlan
                ? "Ending your plan stops the next renewal. Your current benefits remain available until the end of this billing period."
                : "Your plan details are still being synchronized. Refresh billing after a moment to access cancellation controls."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3 gap-2 sm:gap-2">
            {hasManageablePlan ? (
              <>
                <Button variant="outline" onClick={() => setManageOpen(false)} disabled={cancelPlan.isPending}>
                  Keep plan
                </Button>
                <Button variant="destructive" onClick={() => cancelPlan.mutate()} disabled={cancelPlan.isPending}>
                  {cancelPlan.isPending ? <Spinner /> : null}
                  End plan at renewal
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setManageOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => void status.refetch()} disabled={status.isFetching}>
                  <RefreshCw className="size-4" />
                  Refresh billing
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
