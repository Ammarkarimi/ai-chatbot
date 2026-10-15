import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db, bots, documents, conversations } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { monthlyMessageCount } from "@/lib/usage";
import { UsageMeter } from "@/components/UsageMeter";

export const metadata = { title: "Chatbots" };

export default async function DashboardPage() {
  const user = await requireUser();
  const plan = getPlan(user.plan);

  const [botRows, docCounts, convCounts, used] = await Promise.all([
    db.select().from(bots).where(eq(bots.userId, user.id)).orderBy(desc(bots.createdAt)),
    db
      .select({ botId: documents.botId, n: count() })
      .from(documents)
      .innerJoin(bots, eq(documents.botId, bots.id))
      .where(eq(bots.userId, user.id))
      .groupBy(documents.botId),
    db
      .select({ botId: conversations.botId, n: count() })
      .from(conversations)
      .innerJoin(bots, eq(conversations.botId, bots.id))
      .where(eq(bots.userId, user.id))
      .groupBy(conversations.botId),
    monthlyMessageCount(user.id),
  ]);
  const docsBy = new Map(docCounts.map((r) => [r.botId, r.n]));
  const convsBy = new Map(convCounts.map((r) => [r.botId, r.n]));
  const canCreate = botRows.length < plan.bots;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your chatbots</h1>
          <p className="mt-1 text-sm text-slate-600">Welcome back, {user.name.split(" ")[0]}.</p>
        </div>
        {canCreate ? (
          <Link href="/dashboard/bots/new" className="btn-primary">+ New chatbot</Link>
        ) : (
          <Link href="/dashboard/billing" className="btn-secondary">Upgrade to add more bots</Link>
        )}
      </div>

      <div className="card grid gap-6 p-6 sm:grid-cols-2">
        <UsageMeter label="Messages this month" used={used} limit={plan.messagesPerMonth} />
        <UsageMeter label="Chatbots" used={botRows.length} limit={plan.bots} />
      </div>

      {botRows.length === 0 ? (
        <div className="card flex flex-col items-center p-12 text-center">
          <h2 className="text-lg font-semibold">Create your first chatbot</h2>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            Give it a name, upload your documents, and you&apos;ll have an embeddable AI assistant in minutes.
          </p>
          <Link href="/dashboard/bots/new" className="btn-primary mt-6">Create chatbot</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {botRows.map((bot) => (
            <Link key={bot.id} href={`/dashboard/bots/${bot.id}`} className="card p-5 transition hover:border-brand-500">
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 shrink-0 rounded-full" style={{ background: bot.primaryColor }} />
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{bot.name}</h3>
                  <p className="text-xs capitalize text-slate-500">{bot.provider}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-4 text-sm text-slate-600">
                <span>{docsBy.get(bot.id) ?? 0} documents</span>
                <span>{convsBy.get(bot.id) ?? 0} conversations</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
