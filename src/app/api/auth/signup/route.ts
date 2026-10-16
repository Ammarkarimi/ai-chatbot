import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email-tokens";
import { ipKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { jsonError, zodMessage } from "@/lib/http";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export async function POST(req: Request) {
  const limit = await rateLimit(`signup:${ipKey(req)}`, 5, 60 * 60);
  if (!limit.ok) return tooManyRequests("Too many sign-ups from this network. Try again later.", limit.retryAfterSec);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  const { name, email, password } = parsed.data;

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return jsonError("An account with this email already exists", 409);

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash: await bcrypt.hash(password, 12) })
    .returning({ id: users.id, email: users.email, name: users.name });

  // The account works without it; a failed send can be retried from the dashboard banner.
  await sendVerificationEmail(user).catch((err) => console.error("verification email failed", err));
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
