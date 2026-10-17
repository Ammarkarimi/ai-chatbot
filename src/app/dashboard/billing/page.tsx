import { count, eq } from "drizzle-orm";
import { db, bots } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { defaultCurrency } from "@/lib/currency";
import { PricingTable } from "@/components/PricingTable";
import { monthlyMessageCount } from "@/lib/usage";
import { stripeEnabled } from "@/lib/stripe";
import { UsageMeter } from "@/components/UsageMeter";
import { ManageBillingButton } from "@/components/BillingActions";
import { LocalTime } from "@/components/LocalTime";

export const metadata = { title: "Billing" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ success?: string; canceled?: string }> }) {
  const user = await requireUser();
  const plan = getPlan(user.plan);
  const sp = await searchParams;
  const [used, [{ n: botCount }]] = await Promise.all([
    monthlyMessageCount(user.id),
    db.select({ n: count() }).from(bots).where(eq(bots.userId, user.id)),
  ]);
  const billing = stripeEnabled();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="mt-1 text-sm text-slate-600">Manage your plan and see usage for this month.</p>
      </div>

      {sp.success && (
        <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
          Thanks for subscribing! Your plan updates as soon as Stripe confirms the payment (usually a few seconds).
        </p>
      )}
      {sp.canceled && <p className="rounded-lg bg-slate-100 p-4 text-sm text-slate-700">Checkout canceled. No charges were made.</p>}
      {!billing && (
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          Stripe isn&apos;t configured on this server yet. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and price ids to enable upgrades.
        </p>
      )}

      <div className="card space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Current plan</p>
            <p className="text-xl font-bold">{plan.name}</p>
            {user.currentPeriodEnd && user.plan !== "free" && (
              <p className="text-xs text-slate-500">
                {user.subscriptionStatus === "past_due" ? "Payment past due · " : ""}Renews <LocalTime iso={user.currentPeriodEnd.toISOString()} format="date" />
              </p>
            )}
          </div>
          {billing && user.stripeCustomerId && <ManageBillingButton />}
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <UsageMeter label="Messages this month" used={used} limit={plan.messagesPerMonth} />
          <UsageMeter label="Chatbots" used={botCount} limit={plan.bots} />
        </div>
      </div>

      <PricingTable variant="billing" defaultCurrency={await defaultCurrency()} currentPlanId={plan.id} billingEnabled={billing} />
    </div>
  );
}
