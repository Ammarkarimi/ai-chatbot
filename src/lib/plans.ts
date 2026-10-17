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
  /** AI usage included each month when bots run on our API keys (USD; shown converted for INR). */
  aiCreditUsd: number;
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
    aiCreditUsd: 1,
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
    aiCreditUsd: 5,
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
    aiCreditUsd: 20,
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

/**
 * AI usage pricing. Plan prices cover the platform; AI tokens are charged separately when a bot
 * runs on our API keys: each plan includes `aiCreditUsd` a month, then usage costs AI_MARKUP times
 * the provider's list price. Bots with the customer's own key pay the provider directly.
 * List prices are USD per 1M tokens, checked October 2026. Update them when providers change prices.
 */
export const AI_MARKUP = 1.5;
/** Rate used to show USD amounts in rupees. */
export const USD_TO_INR = 90;
/** Rough size of one chat reply: retrieved passages + history in, a short answer out. */
const TYPICAL_REPLY = { input: 2_500, output: 300 };
/** Rough size of one document page when training. */
const TOKENS_PER_PAGE = 500;

export type AiRate = { id: string; name: string; detail: string; input: number; output: number | null };

export const AI_RATES: AiRate[] = [
  { id: "groq", name: "Groq · GPT-OSS 120B", detail: "Fastest replies", input: 0.15, output: 0.6 },
  { id: "gemini", name: "Google Gemini 3.5 Flash", detail: "Highest quality", input: 1.5, output: 9 },
  { id: "embedding", name: "Training (Gemini embeddings)", detail: "Reading your documents", input: 0.15, output: null },
];

/** Our price in USD per 1M tokens. */
export const ourRate = (listUsd: number) => listUsd * AI_MARKUP;

/** Our price in USD for 1,000 typical replies, or for training 1,000 pages. */
export function ourCostPer1000(rate: AiRate) {
  const tokens = rate.output === null
    ? ourRate(rate.input) * TOKENS_PER_PAGE
    : ourRate(rate.input) * TYPICAL_REPLY.input + ourRate(rate.output) * TYPICAL_REPLY.output;
  return (tokens / 1_000_000) * 1_000;
}

/** A USD amount in the chosen currency, with enough decimals for small token prices ("$0.225", "₹20.25"). */
export function formatAmount(usd: number, currency: Currency) {
  const { locale } = CURRENCIES[currency];
  const value = currency === "inr" ? usd * USD_TO_INR : usd;
  const digits = value >= 100 ? 0 : value >= 1 ? 2 : 3;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: Number.isInteger(value) ? 0 : Math.min(2, digits),
    maximumFractionDigits: digits,
  }).format(value);
}
