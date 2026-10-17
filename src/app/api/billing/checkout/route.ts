import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { priceIdForPlan } from "@/lib/plans";
import { appUrl, getStripe, stripeEnabled } from "@/lib/stripe";
import { jsonError } from "@/lib/http";

const schema = z.object({ plan: z.enum(["pro", "business"]), currency: z.enum(["usd", "inr"]).default("usd") });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!stripeEnabled()) return jsonError("Billing is not configured on this server.", 503);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid plan");
  const { plan, currency } = parsed.data;
  const price = priceIdForPlan(plan, currency);
  if (!price) {
    return jsonError(
      currency === "inr" ? "Payment in rupees isn't available yet. Switch to USD or try again later." : "This plan has no Stripe price configured.",
      503,
    );
  }

  const stripe = getStripe();

  // Existing subscribers change plans in the customer portal instead of a second subscription.
  if (user.stripeSubscriptionId && user.subscriptionStatus && user.subscriptionStatus !== "canceled") {
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId!,
      return_url: `${appUrl()}/dashboard/billing`,
    });
    return NextResponse.json({ url: portal.url });
  }

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } });
    customerId = customer.id;
    await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    allow_promotion_codes: true,
    success_url: `${appUrl()}/dashboard/billing?success=1`,
    cancel_url: `${appUrl()}/dashboard/billing?canceled=1`,
  });
  return NextResponse.json({ url: session.url });
}
