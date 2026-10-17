import "server-only";
import { and, count, eq, inArray, lt } from "drizzle-orm";
import { db, documents, type Bot } from "@/lib/db";
import type { Plan } from "@/lib/plans";
import { extractText, UnsupportedFileError } from "@/lib/ai/extract";
import { MissingKeyError } from "@/lib/ai/keys";
import { ingestDocument } from "@/lib/rag";
import { deleteObject, storageEnabled } from "@/lib/storage";

// Vercel rejects request bodies over 4.5 MB, so without object storage cap uploads below that.
const SERVERLESS_BODY_LIMIT_MB = 4;

export function maxUploadMb(plan: Plan) {
  if (storageEnabled() || !process.env.VERCEL) return plan.maxFileMb;
  return Math.min(plan.maxFileMb, SERVERLESS_BODY_LIMIT_MB);
}

export async function documentQuotaError(botId: string, plan: Plan) {
  const [{ n }] = await db.select({ n: count() }).from(documents).where(eq(documents.botId, botId));
  return n >= plan.documentsPerBot
    ? `Your ${plan.name} plan allows ${plan.documentsPerBot} documents per bot. Upgrade for more.`
    : null;
}

/** Removes direct uploads that were started but never finished (tab closed, network lost). */
export async function cleanupAbandonedUploads(botId: string) {
  const stale = await db
    .delete(documents)
    .where(
      and(
        eq(documents.botId, botId),
        eq(documents.status, "uploading"),
        lt(documents.createdAt, new Date(Date.now() - 60 * 60 * 1000)),
      ),
    )
    .returning({ storageKey: documents.storageKey });
  await Promise.all(stale.map((d) => d.storageKey && deleteObject(d.storageKey).catch(() => {})));
}

export class TrainingError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Extracts text from an uploaded file and trains the bot on it; maps failures to user-facing messages. */
export async function trainOnFile(bot: Bot, documentId: string, name: string, buffer: Buffer) {
  let text: string;
  try {
    text = await extractText(name, buffer);
  } catch (err) {
    const message =
      err instanceof UnsupportedFileError ? err.message : "Could not read this file. Is it corrupted or password-protected?";
    if (!(err instanceof UnsupportedFileError)) console.error("extract failed", err);
    await db.update(documents).set({ status: "error", error: message }).where(eq(documents.id, documentId));
    throw new TrainingError(message, err instanceof UnsupportedFileError ? 415 : 422);
  }
  await trainOnText(bot, documentId, text);
}

export async function trainOnText(bot: Bot, documentId: string, text: string) {
  await db.update(documents).set({ status: "processing" }).where(eq(documents.id, documentId));
  try {
    await ingestDocument(bot, documentId, text);
  } catch (err) {
    console.error("ingest failed", err);
    const message =
      err instanceof MissingKeyError || (err instanceof Error && err.message.startsWith("No readable text"))
        ? err.message
        : "Training failed while creating embeddings. Check the API key and try again.";
    throw new TrainingError(message, 502);
  }
}

export async function deleteDocuments(ids: string[]) {
  if (ids.length === 0) return;
  const removed = await db
    .delete(documents)
    .where(inArray(documents.id, ids))
    .returning({ storageKey: documents.storageKey });
  await Promise.all(removed.map((d) => d.storageKey && deleteObject(d.storageKey).catch(() => {})));
}
