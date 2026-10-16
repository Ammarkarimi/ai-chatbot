import { asc, eq } from "drizzle-orm";
import { db, documents } from "@/lib/db";
import { loadOwnedBot } from "@/lib/bot-access";
import { getPlan } from "@/lib/plans";
import { KnowledgeManager } from "@/components/KnowledgeManager";
import { maxUploadMb } from "@/lib/documents";
import { storageEnabled } from "@/lib/storage";

// Training runs inside one request; anything still "processing" after this hit the function timeout.
const STALE_MS = 15 * 60 * 1000;

export default async function KnowledgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { bot, user } = await loadOwnedBot(id);
  const plan = getPlan(user.plan);
  const docs = await db.select().from(documents).where(eq(documents.botId, bot.id)).orderBy(asc(documents.createdAt));

  return (
    <KnowledgeManager
      botId={bot.id}
      maxDocs={plan.documentsPerBot}
      maxFileMb={maxUploadMb(plan)}
      directUpload={storageEnabled()}
      docs={docs.map((d) => {
        const stale = d.status === "processing" && Date.now() - d.createdAt.getTime() > STALE_MS;
        return {
          ...d,
          status: stale ? ("error" as const) : d.status,
          error: stale ? "Training timed out. Remove this document and upload it again." : d.error,
          createdAt: d.createdAt.toISOString(),
        };
      })}
    />
  );
}
