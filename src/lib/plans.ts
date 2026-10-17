export type PlanId = "free" | "pro" | "business";
export type Currency = "usd" | "inr";

export const CURRENCIES: Record<Currency, { label: string; symbol: string; locale: string }> = {
  usd: { label: "USD", symbol: "$", locale: "en-US" },
  inr: { label: "INR", symbol: "₹", locale: "en-IN" },
};

export type Plan = {
  id: PlanId;
  name: string;
  /** Monthly price in each currency (whole units: dollars, rupees). */
  price: Record<Currency, number>;
  bots: number;
  messagesPerMonth: number;
  documentsPerBot: number;
  maxFileMb: number;
  removeBranding: boolean;
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    price: { usd: 0, inr: 0 },
    bots: 1,
    messagesPerMonth: 100,
    documentsPerBot: 5,
    maxFileMb: 4,
    removeBranding: false,
    features: ["1 chatbot", "100 messages / month", "5 documents per bot", "Embed on any website"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: { usd: 29, inr: 1999 },
    bots: 5,
    messagesPerMonth: 5_000,
    documentsPerBot: 50,
    maxFileMb: 10,
    removeBranding: true,
    features: [
      "5 chatbots",
      "5,000 messages / month",
      "50 documents per bot",
      "Remove branding",
      "Bring your own API keys",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    price: { usd: 99, inr: 6999 },
    bots: 25,
    messagesPerMonth: 50_000,
    documentsPerBot: 200,
    maxFileMb: 25,
    removeBranding: true,
    features: [
      "25 chatbots",
      "50,000 messages / month",
      "200 documents per bot",
      "Remove branding",
      "Bring your own API keys",
      "Priority support",
    ],
  },
};

export function getPlan(id: string | null | undefined): Plan {
  return PLANS[(id as PlanId) ?? "free"] ?? PLANS.free;
}

/** "$29" / "₹1,999" */
export function formatPrice(amount: number, currency: Currency) {
  const { symbol, locale } = CURRENCIES[currency];
  return `${symbol}${amount.toLocaleString(locale)}`;
}

// One Stripe price per plan and currency, e.g. STRIPE_PRICE_PRO (USD) and STRIPE_PRICE_PRO_INR.
const PRICE_ENV: Record<Exclude<PlanId, "free">, Record<Currency, string>> = {
  pro: { usd: "STRIPE_PRICE_PRO", inr: "STRIPE_PRICE_PRO_INR" },
  business: { usd: "STRIPE_PRICE_BUSINESS", inr: "STRIPE_PRICE_BUSINESS_INR" },
};

/** Maps a Stripe price id (any currency) back to a plan. */
export function planFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  for (const [plan, envs] of Object.entries(PRICE_ENV)) {
    if (Object.values(envs).some((name) => process.env[name] === priceId)) return plan as PlanId;
  }
  return null;
}

export function priceIdForPlan(plan: PlanId, currency: Currency): string | undefined {
  if (plan === "free") return undefined;
  return process.env[PRICE_ENV[plan][currency]] || undefined;
}
