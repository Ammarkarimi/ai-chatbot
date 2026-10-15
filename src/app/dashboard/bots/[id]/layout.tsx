import Link from "next/link";
import { BotTabs } from "@/components/BotTabs";
import { loadOwnedBot } from "@/lib/bot-access";

export default async function BotLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { bot } = await loadOwnedBot(id);
  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-800">← All chatbots</Link>
        <div className="mt-2 flex items-center gap-3">
          <span className="h-8 w-8 rounded-full" style={{ background: bot.primaryColor }} />
          <h1 className="text-2xl font-bold">{bot.name}</h1>
        </div>
      </div>
      <BotTabs botId={bot.id} />
      {children}
    </div>
  );
}
