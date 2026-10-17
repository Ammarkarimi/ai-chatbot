import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { hashKey, ipKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { jsonError } from "@/lib/http";

const schema = z.object({ email: z.string().max(320), password: z.string().max(200) });

// Compared against when the email doesn't exist, so response time doesn't reveal which accounts exist.
const DUMMY_HASH = "$2b$12$ut6NVpn2Ip9c4eBcYUm7E.LUnxBn7YbGwLYNj75J7E70y1HSUF9c.";

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Email and password are required");
  const email = parsed.data.email.toLowerCase().trim();

  // Per network and per account, to slow down password guessing.
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`login:ip:${ipKey(req)}`, 30, 15 * 60),
    rateLimit(`login:email:${hashKey(email)}`, 10, 15 * 60),
  ]);
  if (!byIp.ok || !byEmail.ok) {
    return tooManyRequests(
      "Too many login attempts. Wait a few minutes or reset your password.",
      Math.max(byIp.retryAfterSec, byEmail.retryAfterSec),
    );
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const valid = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return jsonError("Invalid email or password", 401);

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
