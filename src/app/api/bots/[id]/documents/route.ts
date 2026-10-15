import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { db, bots, documents } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { extractText, UnsupportedFileError } from "@/lib/ai/extract";
import { MissingKeyError } from "@/lib/ai/keys";
import { ingestDocument } from "@/lib/rag";
import { jsonError } from "@/lib/http";

export const maxDuration = 300; // embedding large documents can take a while

type Ctx = { params: Promise<{ id: string }> };

/** Accepts multipart form data with either a `file` or `title` + `text` (pasted content). */
export async function POST(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;

  const [bot] = await db
    .select()
    .from(bots)
    .where(and(eq(bots.id, id), eq(bots.userId, user.id)))
    .limit(1);
  if (!bot) return jsonError("Bot not found", 404);

  const plan = getPlan(user.plan);
  const [{ n }] = await db.select({ n: count() }).from(documents).where(eq(documents.botId, bot.id));
  if (n >= plan.documentsPerBot) {
    return jsonError(`Your ${plan.name} plan allows ${plan.documentsPerBot} documents per bot. Upgrade for more.`, 403);
  }

  const form = await req.formData().catch(() => null);
  if (!form) return jsonError("Expected multipart form data");

  let name: string;
  let mimeType: string;
  let sizeBytes: number;
  let text: string;

  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > plan.maxFileMb * 1024 * 1024) {
      return jsonError(`File is larger than the ${plan.maxFileMb} MB limit of your plan.`, 413);
    }
    try {
      text = await extractText(file);
    } catch (err) {
      if (err instanceof UnsupportedFileError) return jsonError(err.message, 415);
      console.error("extract failed", err);
      return jsonError("Could not read this file. Is it corrupted or password-protected?", 422);
    }
    name = file.name;
    mimeType = file.type || "application/octet-stream";
    sizeBytes = file.size;
  } else {
    text = String(form.get("text") ?? "");
    name = String(form.get("title") ?? "").trim() || "Pasted text";
    mimeType = "text/plain";
    sizeBytes = Buffer.byteLength(text);
    if (!text.trim()) return jsonError("Upload a file or paste some text.");
  }

  const [doc] = await db
    .insert(documents)
    .values({ botId: bot.id, name: name.slice(0, 200), mimeType, sizeBytes })
    .returning();

  try {
    await ingestDocument(bot, doc.id, text);
  } catch (err) {
    console.error("ingest failed", err);
    const message =
      err instanceof MissingKeyError || (err instanceof Error && err.message.startsWith("No readable text"))
        ? err.message
        : "Training failed while creating embeddings. Check the API key and try again.";
    return jsonError(message, 502);
  }

  const [ready] = await db.select().from(documents).where(eq(documents.id, doc.id));
  return NextResponse.json({ document: ready });
}
