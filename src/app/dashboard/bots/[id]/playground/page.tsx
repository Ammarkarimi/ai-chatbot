import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db, documents } from "@/lib/db";
import { loadOwnedBot } from "@/lib/bot-access";
import { ChatWindow } from "@/components/ChatWindow";

export default async function PlaygroundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { bot } = await loadOwnedBot(id);
  const [{ n }] = await db.select({ n: count() }).from(documents).where(eq(documents.botId, bot.id));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <div className="card p-6">
          <h2 className="font-semibold">Test your chatbot</h2>
          <p className="mt-1 text-sm text-slate-600">
            Chat with your bot exactly as visitors will. Playground messages count toward your monthly usage and
            appear under Conversations.
          </p>
          {n === 0 && (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              This bot has no documents yet, so it can&apos;t answer much.{" "}
              <Link href={`/dashboard/bots/${bot.id}`} className="font-medium underline">Upload some first</Link>.
            </p>
          )}
        </div>
        <div className="card p-6 text-sm text-slate-600">
          <h3 className="font-semibold text-slate-900">Tips for better answers</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Upload FAQs, pricing, policies and product details as separate documents.</li>
            <li>Use Settings → Instructions to set tone, language, and what to do when unsure.</li>
            <li>Check Conversations for unanswered questions, then add docs that cover them.</li>
          </ul>
        </div>
      </div>
      <div className="card h-[600px] overflow-hidden">
        <ChatWindow
          botId={bot.id}
          botName={bot.name}
          welcomeMessage={bot.welcomeMessage}
          color={bot.primaryColor}
          source="playground"
        />
      </div>
    </div>
  );
}
