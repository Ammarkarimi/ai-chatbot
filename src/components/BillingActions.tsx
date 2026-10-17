"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import type { Currency } from "@/lib/plans";

export function UpgradeButton({
  plan,
  currency,
  label,
  primary,
}: {
  plan: "pro" | "business";
  currency: Currency;
  label: string;
  primary?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className={`${primary ? "btn-primary" : "btn-secondary"} w-full`}
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError("");
          try {
            const { url } = await api<{ url: string }>("/api/billing/checkout", { method: "POST", json: { plan, currency } });
            window.location.href = url;
          } catch (err) {
            setError((err as Error).message);
            setLoading(false);
          }
        }}
      >
        {loading ? "Redirecting…" : label}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className="btn-secondary"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError("");
          try {
            const { url } = await api<{ url: string }>("/api/billing/portal", { method: "POST" });
            window.location.href = url;
          } catch (err) {
            setError((err as Error).message);
            setLoading(false);
          }
        }}
      >
        {loading ? "Opening…" : "Manage subscription & invoices"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
