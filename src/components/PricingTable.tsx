"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AI_MARKUP,
  AI_RATES,
  CURRENCIES,
  PLANS,
  formatAmount,
  formatPrice,
  ourCostPer1000,
  ourRate,
  type Currency,
  type PlanId,
} from "@/lib/plans";
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
                <li className="flex gap-2">
                  <span className="text-brand-600">✓</span>
                  <span>
                    <strong className="font-semibold text-slate-800">{formatAmount(plan.aiCreditUsd, currency)}</strong> AI credit / month included
                  </span>
                </li>
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
      <AiUsage currency={currency} />
    </div>
  );
}

/** How AI tokens are charged on top of the plan: included credit, then provider price × markup, or your own key. */
function AiUsage({ currency }: { currency: Currency }) {
  return (
    <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-6 py-5">
        <h3 className="text-lg font-semibold">How AI usage is charged</h3>
        <p className="mt-1 text-sm text-slate-600">
          Plan prices cover the platform. The AI that writes each answer is billed by the token, in one of two ways.
        </p>
      </div>
      <div className="grid md:grid-cols-[1fr_1.6fr]">
        <div className="border-b border-slate-100 p-6 md:border-b-0 md:border-r">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Option 1</span>
          <h4 className="mt-3 font-semibold">Bring your own API key</h4>
          <p className="mt-2 text-sm text-slate-600">
            Add your own Gemini or Groq key to a chatbot (Pro and Business). We charge <strong>nothing</strong> for AI on
            that bot; you pay Google or Groq directly at their prices.
          </p>
        </div>
        <div className="p-6">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">Option 2</span>
          <h4 className="mt-3 font-semibold">Use our AI, no setup needed</h4>
          <p className="mt-2 text-sm text-slate-600">
            Your plan&apos;s monthly AI credit is used first. After that, usage is billed at {AI_MARKUP}× the AI
            provider&apos;s list price, per 1 million tokens:
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-2 pr-3 font-medium">Model</th>
                  <th className="pb-2 pr-3 font-medium">Input</th>
                  <th className="pb-2 pr-3 font-medium">Output</th>
                  <th className="pb-2 font-medium">Typical cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {AI_RATES.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-slate-800">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.detail}</p>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatAmount(ourRate(r.input), currency)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{r.output === null ? "—" : formatAmount(ourRate(r.output), currency)}</td>
                    <td className="py-2.5 tabular-nums text-slate-600">
                      ≈ {formatAmount(ourCostPer1000(r), currency)}
                      <span className="text-xs text-slate-500"> / 1,000 {r.output === null ? "pages" : "replies"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
