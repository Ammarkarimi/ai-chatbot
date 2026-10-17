import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { and, eq } from "drizzle-orm";
import { db, bots, documents } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { maxUploadMb } from "@/lib/documents";

/**
 * Vercel Blob client uploads. Two kinds of requests arrive here:
 * 1. The browser asking for an upload token (has the user's session cookie): we only sign a token
 *    for the exact pathname reserved by POST /api/bots/:id/uploads, capped at the plan's size limit,
 *    so Vercel itself rejects bigger files.
 * 2. Vercel's "upload completed" webhook (no cookie, signed by Vercel, verified by handleUpload).
 *    We ignore it: the browser calls /process itself, which also works on localhost.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await getCurrentUser();
        if (!user) throw new Error("Not authenticated");

        const { documentId } = JSON.parse(clientPayload || "{}") as { documentId?: string };
        if (!documentId || !/^[0-9a-f-]{36}$/i.test(documentId)) throw new Error("Missing upload reservation");

        const [doc] = await db
          .select({ storageKey: documents.storageKey, status: documents.status })
          .from(documents)
          .innerJoin(bots, eq(documents.botId, bots.id))
          .where(and(eq(documents.id, documentId), eq(bots.userId, user.id)))
          .limit(1);
        if (!doc || doc.status !== "uploading" || doc.storageKey !== pathname) {
          throw new Error("Upload not found or already finished");
        }

        return {
          maximumSizeInBytes: maxUploadMb(getPlan(user.plan)) * 1024 * 1024,
          addRandomSuffix: false, // the pathname already contains the unique document id
          allowOverwrite: false,
          validUntil: Date.now() + 15 * 60 * 1000,
          tokenPayload: documentId,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
