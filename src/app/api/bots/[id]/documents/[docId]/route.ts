import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, bots, documents } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id, docId } = await params;

  const ownedBot = db.select({ id: bots.id }).from(bots).where(and(eq(bots.id, id), eq(bots.userId, user.id)));
  const deleted = await db
    .delete(documents)
    .where(and(eq(documents.id, docId), inArray(documents.botId, ownedBot)))
    .returning({ id: documents.id });
  if (deleted.length === 0) return jsonError("Document not found", 404);
  return NextResponse.json({ ok: true });
}
