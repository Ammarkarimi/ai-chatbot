import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { appUrl, getStripe, stripeEnabled } from "@/lib/stripe";
import { jsonError } from "@/lib/http";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!stripeEnabled()) return jsonError("Billing is not configured on this server.", 503);
  if (!user.stripeCustomerId) return jsonError("No billing account yet. Choose a plan first.");

  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl()}/dashboard/billing`,
  });
  return NextResponse.json({ url: session.url });
}
