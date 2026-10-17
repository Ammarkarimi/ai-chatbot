import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, bots, users } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { APP_NAME } from "@/lib/config";
import { EmbedChat } from "@/components/EmbedChat";

export const metadata = { title: "Chat", robots: { index: false } };

export default async function EmbedPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(botId)) notFound();

  const [row] = await db
    .select({ bot: bots, plan: users.plan, ownerVerified: users.emailVerifiedAt })
    .from(bots)
    .innerJoin(users, eq(bots.userId, users.id))
    .where(eq(bots.id, botId))
    .limit(1);
  if (!row) notFound();
  if (!row.ownerVerified) {
    return (
      <main className="grid h-dvh place-items-center p-6 text-center text-sm text-slate-500">
        This chatbot isn&apos;t active yet.
      </main>
    );
  }

  return (
    <EmbedChat
      botId={row.bot.id}
      botName={row.bot.name}
      welcomeMessage={row.bot.welcomeMessage}
      color={row.bot.primaryColor}
      showBranding={!getPlan(row.plan).removeBranding}
      appName={APP_NAME}
    />
  );
}
