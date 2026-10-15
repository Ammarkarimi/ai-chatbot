import "server-only";
import { and, count, eq, gte } from "drizzle-orm";
import { db, messages } from "@/lib/db";

export function startOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Visitor questions across all of a customer's bots in the current calendar month. */
export async function monthlyMessageCount(userId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(messages)
    .where(
      and(eq(messages.userId, userId), eq(messages.role, "user"), gte(messages.createdAt, startOfMonth())),
    );
  return row?.n ?? 0;
}
