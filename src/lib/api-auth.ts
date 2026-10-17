import "server-only";
import { and, eq } from "drizzle-orm";
import { db, bots } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID.test(value);

/** For API routes: the signed-in user and their bot, or null if either is missing. */
export async function ownedBotForApi(botId: string) {
  const user = await getCurrentUser();
  if (!user || !UUID.test(botId)) return { user, bot: null };
  const [bot] = await db
    .select()
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.userId, user.id)))
    .limit(1);
  return { user, bot: bot ?? null };
}
