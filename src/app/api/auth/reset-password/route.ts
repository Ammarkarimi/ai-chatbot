import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, emailTokens, users } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { consumeToken } from "@/lib/email-tokens";
import { ipKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { jsonError, zodMessage } from "@/lib/http";

const schema = z.object({
  token: z.string().min(1).max(100),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export async function POST(req: Request) {
  const limit = await rateLimit(`reset:ip:${ipKey(req)}`, 10, 15 * 60);
  if (!limit.ok) return tooManyRequests("Too many attempts. Try again later.", limit.retryAfterSec);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));

  const userId = await consumeToken(parsed.data.token, "reset_password");
  if (!userId) return jsonError("This reset link is invalid or has expired. Request a new one.", 400);

  // Receiving the email proves they own the address, so this also verifies it.
  const now = new Date();
  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(parsed.data.password, 12), passwordChangedAt: now })
    .where(eq(users.id, userId));
  await db.update(users).set({ emailVerifiedAt: now }).where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)));
  await db
    .update(emailTokens)
    .set({ usedAt: now })
    .where(and(eq(emailTokens.userId, userId), eq(emailTokens.type, "reset_password"), isNull(emailTokens.usedAt)));

  // All older sessions are now invalid (passwordChangedAt); start a fresh one here.
  await createSession(userId);
  return NextResponse.json({ ok: true });
}
