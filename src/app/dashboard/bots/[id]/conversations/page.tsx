import Link from "next/link";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db, conversations, messages } from "@/lib/db";
import { loadOwnedBot } from "@/lib/bot-access";

const PAGE_SIZE = 25;

export default async function ConversationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { bot } = await loadOwnedBot(id);
  const page = Math.max(1, Number((await searchParams).page) || 1);

  const firstQuestion = sql<string>`(
    select ${messages.content} from ${messages}
    where ${messages.conversationId} = ${conversations.id} and ${messages.role} = 'user'
    order by ${messages.createdAt} asc limit 1
  )`;
  const messageCount = sql<number>`(select count(*)::int from ${messages} where ${messages.conversationId} = ${conversations.id})`;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: conversations.id,
        source: conversations.source,
        lastMessageAt: conversations.lastMessageAt,
        firstQuestion,
        messageCount,
      })
      .from(conversations)
      .where(eq(conversations.botId, bot.id))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(conversations).where(and(eq(conversations.botId, bot.id))),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="font-semibold">Conversations</h2>
        <span className="text-sm text-slate-500">{total} total</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-slate-500">
          No conversations yet. Try the Playground or embed the bot on your site.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/dashboard/bots/${bot.id}/conversations/${c.id}`} className="flex items-center justify-between gap-4 px-6 py-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.firstQuestion ?? "(no messages)"}</p>
                  <p className="text-xs text-slate-500">
                    {c.messageCount} messages · {c.lastMessageAt.toLocaleString()}
                  </p>
                </div>
                {c.source === "playground" && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Playground</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 text-sm">
          {page > 1 ? <Link href={`?page=${page - 1}`} className="text-brand-600">← Newer</Link> : <span />}
          <span className="text-slate-500">Page {page} of {pages}</span>
          {page < pages ? <Link href={`?page=${page + 1}`} className="text-brand-600">Older →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
