import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, conversations, messages } from "@/lib/db";
import { loadOwnedBot } from "@/lib/bot-access";
import { Markdown } from "@/components/Markdown";

export default async function ConversationPage({ params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id, cid } = await params;
  const { bot } = await loadOwnedBot(id);
  if (!/^[0-9a-f-]{36}$/i.test(cid)) notFound();

  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, cid), eq(conversations.botId, bot.id)))
    .limit(1);
  if (!conv) notFound();
  const rows = await db.select().from(messages).where(eq(messages.conversationId, conv.id)).orderBy(asc(messages.createdAt));

  return (
    <div className="space-y-4">
      <Link href={`/dashboard/bots/${bot.id}/conversations`} className="text-sm text-slate-500 hover:text-slate-800">
        ← Back to conversations
      </Link>
      <div className="card p-6">
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          <span>Started {conv.createdAt.toLocaleString()}</span>
          <span>Source: {conv.source}</span>
          {conv.pageUrl && <span className="truncate">Page: {conv.pageUrl}</span>}
          <span>Visitor: {conv.visitorId.slice(0, 8)}</span>
        </div>
        <div className="space-y-3">
          {rows.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  m.role === "user" ? "text-white" : "border border-slate-200 bg-slate-50"
                }`}
                style={m.role === "user" ? { background: bot.primaryColor } : undefined}
              >
                {m.role === "assistant" ? <Markdown text={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
                <p className={`mt-1 text-[10px] ${m.role === "user" ? "text-white/70" : "text-slate-400"}`}>
                  {m.createdAt.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
