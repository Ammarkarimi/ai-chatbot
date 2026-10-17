import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, documents } from "@/lib/db";
import { ownedBotForApi } from "@/lib/api-auth";
import { getPlan } from "@/lib/plans";
import { deleteDocuments, maxUploadMb, trainOnFile, TrainingError } from "@/lib/documents";
import { deleteObject, downloadObject, objectSize } from "@/lib/storage";
import { jsonError } from "@/lib/http";

export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string; docId: string }> };

/** Step 2 of a direct upload: the browser finished PUTting the file; download it and train. */
export async function POST(_req: Request, { params }: Ctx) {
  const { id, docId } = await params;
  const { user, bot } = await ownedBotForApi(id);
  if (!user) return jsonError("Unauthorized", 401);
  if (!bot) return jsonError("Bot not found", 404);
  if (!/^[0-9a-f-]{36}$/i.test(docId)) return jsonError("Upload not found", 404);

  // Claim the document atomically so a double-click can't process it twice.
  const [doc] = await db
    .update(documents)
    .set({ status: "processing" })
    .where(and(eq(documents.id, docId), eq(documents.botId, bot.id), eq(documents.status, "uploading")))
    .returning();
  if (!doc?.storageKey) return jsonError("Upload not found or already processed", 404);
  const key = doc.storageKey;

  // Never trust the size the browser announced: check what actually landed in the bucket.
  const size = await objectSize(key);
  const limitBytes = maxUploadMb(getPlan(user.plan)) * 1024 * 1024;
  if (size === null || size === 0 || size > limitBytes) {
    await deleteDocuments([doc.id]);
    return jsonError(size ? "The uploaded file is larger than your plan allows." : "The upload didn't complete. Please try again.", size ? 413 : 400);
  }

  try {
    const buffer = await downloadObject(key);
    await db.update(documents).set({ sizeBytes: size }).where(eq(documents.id, doc.id));
    await trainOnFile(bot, doc.id, doc.name, buffer);
  } catch (err) {
    if (err instanceof TrainingError) return jsonError(err.message, err.status);
    console.error("process upload failed", err);
    await db.update(documents).set({ status: "error", error: "Could not read the uploaded file." }).where(eq(documents.id, doc.id));
    return jsonError("Could not read the uploaded file.", 502);
  } finally {
    // The text and embeddings are in Postgres now; the original file isn't needed.
    await deleteObject(key).catch((e) => console.error("delete object failed", e));
    await db.update(documents).set({ storageKey: null }).where(eq(documents.id, doc.id));
  }

  const [ready] = await db.select().from(documents).where(eq(documents.id, doc.id));
  return NextResponse.json({ document: ready });
}
