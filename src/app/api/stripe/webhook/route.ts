import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db, users } from "@/lib/db";
import { planFromPriceId } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";

const ACTIVE = new Set(["active", "trialing", "past_due"]);

async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const item = sub.items.data[0];
  const paidPlan = planFromPriceId(item?.price.id);
  const plan = ACTIVE.has(sub.status) && paidPlan ? paidPlan : "free";
  const periodEnd = item?.current_period_end;

  await db
    .update(users)
    .set({
      plan,
      stripeSubscriptionId: sub.status === "canceled" ? null : sub.id,
      subscriptionStatus: sub.status,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    })
    .where(eq(users.stripeCustomerId, customerId));
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Webhook not configured", { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch (err) {
    return new Response(`Invalid signature: ${(err as Error).message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await syncSubscription(await stripe.subscriptions.retrieve(subId));
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;
  }

  return Response.json({ received: true });
}
