import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, documents } from "@/lib/db";
import { ownedBotForApi } from "@/lib/api-auth";
import { getPlan } from "@/lib/plans";
import { isSupported } from "@/lib/ai/extract";
import { cleanupAbandonedUploads, documentQuotaError, maxUploadMb } from "@/lib/documents";
import { presignUpload, storageEnabled } from "@/lib/storage";
import { jsonError, zodMessage } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  size: z.number().int().positive(),
  contentType: z.string().max(200).optional(),
});

/** Step 1 of a direct upload: reserve a document and return a presigned PUT URL. */
export async function POST(req: Request, { params }: Ctx) {
  if (!storageEnabled()) return jsonError("Direct uploads aren't configured on this server.", 501);
  const { user, bot } = await ownedBotForApi((await params).id);
  if (!user) return jsonError("Unauthorized", 401);
  if (!bot) return jsonError("Bot not found", 404);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  const { name, size, contentType } = parsed.data;

  const plan = getPlan(user.plan);
  const limitMb = maxUploadMb(plan);
  if (size > limitMb * 1024 * 1024) return jsonError(`File is larger than the ${limitMb} MB limit of your plan.`, 413);
  if (!isSupported(name)) return jsonError("Unsupported file type. Use PDF, DOCX, TXT, MD or CSV.", 415);

  await cleanupAbandonedUploads(bot.id);
  const quotaError = await documentQuotaError(bot.id, plan);
  if (quotaError) return jsonError(quotaError, 403);

  const [doc] = await db
    .insert(documents)
    .values({
      botId: bot.id,
      name,
      mimeType: contentType || "application/octet-stream",
      sizeBytes: size,
      status: "uploading",
    })
    .returning({ id: documents.id });

  // Random-looking key scoped by bot; the original name is kept only in the database.
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  const storageKey = `uploads/${bot.id}/${doc.id}${ext}`;
  await db.update(documents).set({ storageKey }).where(eq(documents.id, doc.id));

  return NextResponse.json({ documentId: doc.id, uploadUrl: await presignUpload(storageKey) });
}
