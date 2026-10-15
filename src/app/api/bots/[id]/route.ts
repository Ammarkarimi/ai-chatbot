import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, bots } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { getPlan } from "@/lib/plans";
import { botSettingsSchema } from "@/lib/bot-input";
import { jsonError, zodMessage } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;

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

  const deleted = await db
    .delete(bots)
    .where(and(eq(bots.id, id), eq(bots.userId, user.id)))
    .returning({ id: bots.id });
  if (deleted.length === 0) return jsonError("Bot not found", 404);
  return NextResponse.json({ ok: true });
}
