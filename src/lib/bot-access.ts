import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, bots } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/** Loads a bot owned by the signed-in user, or 404s. Cached per request. */
export const loadOwnedBot = cache(async (botId: string) => {
  const user = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(botId)) notFound();
  const [bot] = await db
    .select()
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.userId, user.id)))
    .limit(1);
  if (!bot) notFound();
  return { bot, user };
});
