import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";

const schema = z.object({ email: z.string(), password: z.string() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Email and password are required");

  const email = parsed.data.email.toLowerCase().trim();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return jsonError("Invalid email or password", 401);
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
