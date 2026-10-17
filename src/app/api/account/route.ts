import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { and, eq, isNotNull } from "drizzle-orm";
import Stripe from "stripe";
import { z } from "zod";
import { db, bots, documents, users } from "@/lib/db";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { deleteDocuments } from "@/lib/documents";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { jsonError, zodMessage } from "@/lib/http";

const profileSchema = z.object({ name: z.string().trim().min(1, "Name is required").max(100) });

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = profileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));

  await db.update(users).set({ name: parsed.data.name }).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({ password: z.string().min(1, "Enter your password").max(200) });

/** Permanently deletes the account: cancels any subscription, then all bots, documents and chats. */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const limit = await rateLimit(`account-delete:${user.id}`, 10, 15 * 60);
  if (!limit.ok) return tooManyRequests("Too many attempts. Try again later.", limit.retryAfterSec);

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) return jsonError("Incorrect password", 401);

  // Stop billing first, so a failure here leaves the account intact rather than charging a deleted user.
  if (user.stripeSubscriptionId && stripeEnabled()) {
    try {
      await getStripe().subscriptions.cancel(user.stripeSubscriptionId);
    } catch (err) {
      const alreadyGone = err instanceof Stripe.errors.StripeError && err.code === "resource_missing";
      if (!alreadyGone) {
        console.error("subscription cancel failed", err);
        return jsonError("We couldn't cancel your subscription. Please try again or contact support.", 502);
      }
    }
  }

  // Files still waiting in object storage aren't covered by the database cascade.
  const pending = await db
    .select({ id: documents.id })
    .from(documents)
    .innerJoin(bots, eq(documents.botId, bots.id))
    .where(and(eq(bots.userId, user.id), isNotNull(documents.storageKey)));
  await deleteDocuments(pending.map((d) => d.id));

  await db.delete(users).where(eq(users.id, user.id));
  await destroySession();
  return NextResponse.json({ ok: true });
}
