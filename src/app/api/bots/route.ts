import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { db, bots } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { jsonError, zodMessage } from "@/lib/http";

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  provider: z.enum(["gemini", "groq"]).default("gemini"),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));

  const plan = getPlan(user.plan);
  const [{ n }] = await db.select({ n: count() }).from(bots).where(eq(bots.userId, user.id));
  if (n >= plan.bots) {
    return jsonError(`Your ${plan.name} plan allows ${plan.bots} chatbot(s). Upgrade to create more.`, 403);
  }

  const [bot] = await db
    .insert(bots)
    .values({ userId: user.id, name: parsed.data.name, provider: parsed.data.provider })
    .returning({ id: bots.id });
  return NextResponse.json({ id: bot.id });
}
