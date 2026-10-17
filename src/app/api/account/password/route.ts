import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users } from "@/lib/db";
import { createSession, getCurrentUser } from "@/lib/auth";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { jsonError, zodMessage } from "@/lib/http";

const schema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(200),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(200),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const limit = await rateLimit(`password-change:${user.id}`, 10, 15 * 60);
  if (!limit.ok) return tooManyRequests("Too many attempts. Try again later.", limit.retryAfterSec);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return jsonError("Current password is incorrect", 401);
  }

  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(parsed.data.newPassword, 12), passwordChangedAt: new Date() })
    .where(eq(users.id, user.id));
  // Other devices are signed out (passwordChangedAt); keep this one signed in.
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
