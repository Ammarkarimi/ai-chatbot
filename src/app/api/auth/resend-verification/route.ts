import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email-tokens";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { jsonError } from "@/lib/http";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.emailVerifiedAt) return NextResponse.json({ ok: true, alreadyVerified: true });

  const limit = await rateLimit(`resend-verify:${user.id}`, 3, 60 * 60);
  if (!limit.ok) return tooManyRequests("You've requested several emails already. Check your spam folder or try again later.", limit.retryAfterSec);

  try {
    await sendVerificationEmail(user);
  } catch (err) {
    console.error("verification email failed", err);
    return jsonError("We couldn't send the email right now. Please try again shortly.", 502);
  }
  return NextResponse.json({ ok: true });
}
