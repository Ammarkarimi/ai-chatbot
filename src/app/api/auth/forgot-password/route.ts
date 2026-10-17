import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email-tokens";
import { hashKey, ipKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { jsonError } from "@/lib/http";

const schema = z.object({ email: z.email().transform((e) => e.toLowerCase().trim()) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter a valid email");
  const { email } = parsed.data;

  const [byIp, byEmail] = await Promise.all([
    rateLimit(`forgot:ip:${ipKey(req)}`, 10, 60 * 60),
    rateLimit(`forgot:email:${hashKey(email)}`, 3, 60 * 60),
  ]);
  if (!byIp.ok) return tooManyRequests("Too many requests. Try again later.", byIp.retryAfterSec);

  // Same response whether or not the account exists, so emails can't be enumerated.
  if (byEmail.ok) {
    const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, email)).limit(1);
    if (user) await sendPasswordResetEmail(user).catch((err) => console.error("reset email failed", err));
  }
  return NextResponse.json({ ok: true });
}
