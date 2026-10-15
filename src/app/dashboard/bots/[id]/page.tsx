import { asc, eq } from "drizzle-orm";
import { db, documents } from "@/lib/db";
import { loadOwnedBot } from "@/lib/bot-access";
import { getPlan } from "@/lib/plans";
import { KnowledgeManager } from "@/components/KnowledgeManager";

export default async function KnowledgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { bot, user } = await loadOwnedBot(id);
  const plan = getPlan(user.plan);
  const docs = await db.select().from(documents).where(eq(documents.botId, bot.id)).orderBy(asc(documents.createdAt));

  return (
    <KnowledgeManager
      botId={bot.id}
      maxDocs={plan.documentsPerBot}
      maxFileMb={plan.maxFileMb}
      docs={docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }))}
    />
  );
}
