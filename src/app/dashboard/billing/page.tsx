import { count, eq } from "drizzle-orm";
import { db, bots } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PLANS, getPlan } from "@/lib/plans";
import { monthlyMessageCount } from "@/lib/usage";
import { stripeEnabled } from "@/lib/stripe";
import { UsageMeter } from "@/components/UsageMeter";
import { ManageBillingButton, UpgradeButton } from "@/components/BillingActions";

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
                {user.subscriptionStatus === "past_due" ? "Payment past due · " : ""}Renews {user.currentPeriodEnd.toLocaleDateString()}
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

      <div className="grid gap-6 md:grid-cols-3">
        {Object.values(PLANS).map((p) => {
          const current = p.id === plan.id;
          return (
            <div key={p.id} className={`card flex flex-col p-6 ${current ? "ring-2 ring-brand-600" : ""}`}>
              <h3 className="font-semibold">{p.name}</h3>
              <p className="mt-2 text-3xl font-bold">${p.priceMonthly}<span className="text-sm font-normal text-slate-500">/mo</span></p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-600">
                {p.features.map((f) => <li key={f}>✓ {f}</li>)}
              </ul>
              <div className="mt-6">
                {current ? (
                  <p className="text-center text-sm font-medium text-brand-700">Current plan</p>
                ) : p.id === "free" ? (
                  <p className="text-center text-xs text-slate-500">Cancel from “Manage subscription” to downgrade</p>
                ) : billing ? (
                  <UpgradeButton plan={p.id} label={`Switch to ${p.name}`} primary={p.id === "pro"} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
