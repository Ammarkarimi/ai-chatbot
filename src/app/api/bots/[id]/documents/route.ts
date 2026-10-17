import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, documents } from "@/lib/db";
import { ownedBotForApi } from "@/lib/api-auth";
import { getPlan } from "@/lib/plans";
import { isSupported } from "@/lib/ai/extract";
import { documentQuotaError, maxUploadMb, trainOnFile, trainOnText, TrainingError } from "@/lib/documents";
import { jsonError } from "@/lib/http";

export const maxDuration = 300; // embedding large documents can take a while

type Ctx = { params: Promise<{ id: string }> };

/**
 * Small uploads sent through the app: multipart form data with either a `file` or `title` + `text`.
 * Large files go straight to object storage instead (see ../uploads).
 */
export async function POST(req: Request, { params }: Ctx) {
  const { user, bot } = await ownedBotForApi((await params).id);
  if (!user) return jsonError("Unauthorized", 401);
  if (!bot) return jsonError("Bot not found", 404);

  const plan = getPlan(user.plan);
  const quotaError = await documentQuotaError(bot.id, plan);
  if (quotaError) return jsonError(quotaError, 403);

  const form = await req.formData().catch(() => null);
  if (!form) return jsonError("Expected multipart form data (or the file is too large to send directly)", 413);

  const file = form.get("file");
  try {
    if (file instanceof File && file.size > 0) {
      const limitMb = maxUploadMb(plan);
      if (file.size > limitMb * 1024 * 1024) return jsonError(`File is larger than the ${limitMb} MB limit.`, 413);
      if (!isSupported(file.name)) return jsonError("Unsupported file type. Use PDF, DOCX, TXT, MD or CSV.", 415);

      const [doc] = await db
        .insert(documents)
        .values({
          botId: bot.id,
          name: file.name.slice(0, 200),
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          status: "processing",
        })
        .returning();
      await trainOnFile(bot, doc.id, file.name, Buffer.from(await file.arrayBuffer()));
      return NextResponse.json({ document: await reload(doc.id) });
    }

    const text = String(form.get("text") ?? "");
    if (!text.trim()) return jsonError("Upload a file or paste some text.");
    const [doc] = await db
      .insert(documents)
      .values({
        botId: bot.id,
        name: String(form.get("title") ?? "").trim().slice(0, 200) || "Pasted text",
        mimeType: "text/plain",
        sizeBytes: Buffer.byteLength(text),
        status: "processing",
      })
      .returning();
    await trainOnText(bot, doc.id, text);
    return NextResponse.json({ document: await reload(doc.id) });
  } catch (err) {
    if (err instanceof TrainingError) return jsonError(err.message, err.status);
    throw err;
  }
}

async function reload(id: string) {
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  return doc;
}
