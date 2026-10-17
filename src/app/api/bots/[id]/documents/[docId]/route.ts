import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, documents } from "@/lib/db";
import { ownedBotForApi } from "@/lib/api-auth";
import { deleteDocuments } from "@/lib/documents";
import { jsonError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id, docId } = await params;
  const { user, bot } = await ownedBotForApi(id);
  if (!user) return jsonError("Unauthorized", 401);
  if (!bot) return jsonError("Bot not found", 404);
  if (!/^[0-9a-f-]{36}$/i.test(docId)) return jsonError("Document not found", 404);

  const [doc] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, docId), eq(documents.botId, bot.id)))
    .limit(1);
  if (!doc) return jsonError("Document not found", 404);
  await deleteDocuments([doc.id]);
  return NextResponse.json({ ok: true });
}
