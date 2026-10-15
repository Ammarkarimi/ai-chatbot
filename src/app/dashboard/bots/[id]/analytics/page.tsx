import { and, count, countDistinct, desc, eq, gte, sql } from "drizzle-orm";
import { db, conversations, messages } from "@/lib/db";
import { loadOwnedBot } from "@/lib/bot-access";

const DAYS = 30;

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { bot } = await loadOwnedBot(id);
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const recent = and(eq(messages.botId, bot.id), gte(messages.createdAt, since));
  const day = sql<string>`to_char(date_trunc('day', ${messages.createdAt}), 'YYYY-MM-DD')`;

  const [[totals], [visitors], daily, latestQuestions] = await Promise.all([
    db
      .select({
        conversations: countDistinct(messages.conversationId),
        questions: count(sql`case when ${messages.role} = 'user' then 1 end`),
      })
      .from(messages)
      .where(recent),
    db
      .select({ n: countDistinct(conversations.visitorId) })
      .from(conversations)
      .where(and(eq(conversations.botId, bot.id), gte(conversations.lastMessageAt, since))),
    db
      .select({ day, n: count() })
      .from(messages)
      .where(and(recent, eq(messages.role, "user")))
      .groupBy(day)
      .orderBy(day),
    db
      .select({ content: messages.content, createdAt: messages.createdAt })
      .from(messages)
      .where(and(recent, eq(messages.role, "user")))
      .orderBy(desc(messages.createdAt))
      .limit(15),
  ]);

  // Fill missing days so the chart has a bar for every date.
  const byDay = new Map(daily.map((d) => [d.day, d.n]));
  const series = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(Date.now() - (DAYS - 1 - i) * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    return { key, n: byDay.get(key) ?? 0 };
  });
  const max = Math.max(1, ...series.map((s) => s.n));

  const stats = [
    { label: "Conversations", value: totals.conversations },
    { label: "Questions asked", value: totals.questions },
    { label: "Unique visitors", value: visitors.n },
    { label: "Avg. questions / chat", value: totals.conversations ? (totals.questions / totals.conversations).toFixed(1) : "0" },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">Last {DAYS} days</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="font-semibold">Questions per day</h2>
        <div className="mt-6 flex h-40 items-end gap-1" role="img" aria-label="Bar chart of questions per day">
          {series.map((s) => (
            <div key={s.key} className="group relative flex-1">
              <div
                className="w-full rounded-t bg-brand-500 transition group-hover:bg-brand-700"
                style={{ height: `${Math.max(2, (s.n / max) * 160)}px`, opacity: s.n ? 1 : 0.2 }}
              />
              <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                {s.key.slice(5)}: {s.n}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-400">
          <span>{series[0].key.slice(5)}</span>
          <span>{series[series.length - 1].key.slice(5)}</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <h2 className="border-b border-slate-200 px-6 py-4 font-semibold">Latest questions</h2>
        {latestQuestions.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-slate-500">No questions yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {latestQuestions.map((q, i) => (
              <li key={i} className="flex justify-between gap-4 px-6 py-3 text-sm">
                <span className="min-w-0 truncate">{q.content}</span>
                <span className="shrink-0 text-xs text-slate-400">{q.createdAt.toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
