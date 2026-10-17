"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CURRENCIES, PLANS, formatPrice, type Currency, type PlanId } from "@/lib/plans";
import { UpgradeButton } from "@/components/BillingActions";

const STORAGE_KEY = "bf_currency";

function savedCurrency(): Currency | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "usd" || value === "inr" ? value : null;
  } catch {
    return null;
  }
}

export function CurrencyToggle({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <div role="radiogroup" aria-label="Currency" className="inline-flex rounded-lg bg-slate-200/70 p-1 text-sm">
      {(Object.keys(CURRENCIES) as Currency[]).map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          onClick={() => onChange(c)}
          className={`rounded-md px-4 py-1.5 font-medium transition ${
            value === c ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {CURRENCIES[c].symbol} {CURRENCIES[c].label}
        </button>
      ))}
    </div>
  );
}

type Props =
  | { variant: "landing"; defaultCurrency: Currency }
  | { variant: "billing"; defaultCurrency: Currency; currentPlanId: PlanId; billingEnabled: boolean };

/** Plan cards with a USD / INR switch. The landing page links to sign-up; the billing page starts checkout. */
export function PricingTable(props: Props) {
  const [currency, setCurrency] = useState<Currency>(props.defaultCurrency);

  // Respect a choice the visitor made earlier (after hydration, so server HTML always matches).
  useEffect(() => {
    const saved = savedCurrency();
    if (saved) setCurrency(saved);
  }, []);

  function choose(c: Currency) {
    setCurrency(c);
    try {
      window.localStorage.setItem(STORAGE_KEY, c);
    } catch {}
  }

  const landing = props.variant === "landing";

  return (
    <div>
      <div className="flex justify-center">
        <CurrencyToggle value={currency} onChange={choose} />
      </div>
      <div className={`grid gap-6 md:grid-cols-3 ${landing ? "mt-10" : "mt-6"}`}>
        {Object.values(PLANS).map((plan) => {
          const current = !landing && plan.id === props.currentPlanId;
          const highlighted = landing ? plan.id === "pro" : current;
          return (
            <div key={plan.id} className={`card flex flex-col p-6 ${highlighted ? "ring-2 ring-brand-600" : ""}`}>
              <h3 className={landing ? "text-lg font-semibold" : "font-semibold"}>{plan.name}</h3>
              <p className={`font-bold ${landing ? "mt-4 text-4xl" : "mt-2 text-3xl"}`}>
                {formatPrice(plan.price[currency], currency)}
                <span className={`font-normal text-slate-500 ${landing ? "text-base" : "text-sm"}`}>/mo</span>
              </p>
              <ul className={`flex-1 text-sm text-slate-600 ${landing ? "mt-6 space-y-2" : "mt-4 space-y-1.5"}`}>
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-brand-600">✓</span>{f}</li>
                ))}
              </ul>
              <div className={landing ? "mt-8" : "mt-6"}>
                {landing ? (
                  <Link href="/signup" className={`w-full ${plan.id === "pro" ? "btn-primary" : "btn-secondary"}`}>
                    {plan.price[currency] === 0 ? "Start free" : `Choose ${plan.name}`}
                  </Link>
                ) : current ? (
                  <p className="text-center text-sm font-medium text-brand-700">Current plan</p>
                ) : plan.id === "free" ? (
                  <p className="text-center text-xs text-slate-500">Cancel from “Manage subscription” to downgrade</p>
                ) : props.billingEnabled ? (
                  <UpgradeButton plan={plan.id} currency={currency} label={`Switch to ${plan.name}`} primary={plan.id === "pro"} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">
        Prices are per month{currency === "inr" ? " and exclude GST where applicable" : ""}. Cancel anytime.
      </p>
    </div>
  );
}
