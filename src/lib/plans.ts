export type PlanId = "free" | "pro" | "business";

export type Plan = {
  id: PlanId;
  name: string;
  priceMonthly: number;
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
    priceMonthly: 0,
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
    priceMonthly: 29,
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
    priceMonthly: 99,
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

/** Maps a Stripe price id back to a plan (configured via env). */
export function planFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_BUSINESS) return "business";
  return null;
}

export function priceIdForPlan(plan: PlanId): string | undefined {
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO;
  if (plan === "business") return process.env.STRIPE_PRICE_BUSINESS;
  return undefined;
}
