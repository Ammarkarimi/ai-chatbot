import "server-only";
import { headers } from "next/headers";
import type { Currency } from "@/lib/plans";

/**
 * Which currency the pricing toggle starts on. Vercel tells us the visitor's country; elsewhere
 * an Indian browser language is the best hint. Visitors can always switch.
 */
export async function defaultCurrency(): Promise<Currency> {
  const h = await headers();
  const country = h.get("x-vercel-ip-country");
  if (country) return country.toUpperCase() === "IN" ? "inr" : "usd";
  return /\b(en-IN|hi|bn|ta|te|mr|gu|kn|ml|pa)\b/i.test(h.get("accept-language") ?? "") ? "inr" : "usd";
}
