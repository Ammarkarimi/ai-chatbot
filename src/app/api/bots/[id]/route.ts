import { NextResponse } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { db, bots, documents } from "@/lib/db";
import { deleteDocuments } from "@/lib/documents";
import { getCurrentUser } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { getPlan } from "@/lib/plans";
import { botSettingsSchema } from "@/lib/bot-input";
import { jsonError, zodMessage } from "@/lib/http";
import { isUuid } from "@/lib/api-auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;
  if (!isUuid(id)) return jsonError("Bot not found", 404);

  const parsed = botSettingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  const { geminiApiKey, groqApiKey, ...settings } = parsed.data;

  const byoAllowed = getPlan(user.plan).id !== "free";
  if (!byoAllowed && (geminiApiKey || groqApiKey)) {
    return jsonError("Bring-your-own API keys are available on paid plans.", 403);
  }

  const keyUpdates: Partial<typeof bots.$inferInsert> = {};
  if (geminiApiKey !== undefined) keyUpdates.geminiApiKeyEnc = geminiApiKey ? encrypt(geminiApiKey) : null;
  if (groqApiKey !== undefined) keyUpdates.groqApiKeyEnc = groqApiKey ? encrypt(groqApiKey) : null;

  const updated = await db
    .update(bots)
    .set({ ...settings, ...keyUpdates, updatedAt: new Date() })
    .where(and(eq(bots.id, id), eq(bots.userId, user.id)))
    .returning({ id: bots.id });
  if (updated.length === 0) return jsonError("Bot not found", 404);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;
  if (!isUuid(id)) return jsonError("Bot not found", 404);

  // Remove any files still waiting in object storage before the rows cascade away.
  const pending = await db
    .select({ id: documents.id })
    .from(documents)
    .innerJoin(bots, eq(documents.botId, bots.id))
    .where(and(eq(documents.botId, id), eq(bots.userId, user.id), isNotNull(documents.storageKey)));
  await deleteDocuments(pending.map((d) => d.id));

  const deleted = await db
    .delete(bots)
    .where(and(eq(bots.id, id), eq(bots.userId, user.id)))
    .returning({ id: bots.id });
  if (deleted.length === 0) return jsonError("Bot not found", 404);
  return NextResponse.json({ ok: true });
}
