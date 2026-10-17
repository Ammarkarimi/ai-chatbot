import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, bots, conversations, messages, users } from "@/lib/db";
import { streamChat } from "@/lib/ai/chat";
import { MissingKeyError } from "@/lib/ai/keys";
import { buildSystemPrompt, conversationHistory, retrieveContext } from "@/lib/rag";
import { getPlan } from "@/lib/plans";
import { monthlyMessageCount } from "@/lib/usage";
import { CORS_HEADERS, preflight } from "@/lib/cors";
import { getCurrentUser } from "@/lib/auth";
import { isOriginAllowed } from "@/lib/domains";
import { ipKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const maxDuration = 60;

const BURST_PER_MINUTE = 8;
const SHARED_IP_MULTIPLIER = 5;
const DAY = 24 * 60 * 60;

type Ctx = { params: Promise<{ botId: string }> };

const schema = z.object({
  message: z.string().trim().min(1).max(2000),
  visitorId: z.string().min(8).max(64),
  conversationId: z.uuid().nullish(),
  source: z.enum(["widget", "playground"]).default("widget"),
  pageUrl: z.string().max(500).nullish(),
});

function error(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: CORS_HEADERS });
}

export async function POST(req: Request, { params }: Ctx) {
  const { botId } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !z.uuid().safeParse(botId).success) return error("Invalid request", 400);
  const input = parsed.data;

  const [row] = await db
    .select({ bot: bots, plan: users.plan, ownerVerified: users.emailVerifiedAt })
    .from(bots)
    .innerJoin(users, eq(bots.userId, users.id))
    .where(eq(bots.id, botId))
    .limit(1);
  if (!row) return error("Chatbot not found", 404);
  const { bot } = row;

  if (input.source === "playground") {
    // Only the owner may use the playground; it skips the visitor limits below.
    const user = await getCurrentUser();
    if (user?.id !== bot.userId) return error("Not allowed", 403);
  } else {
    // Browsers always send Origin on POST, so other websites can't call the bot directly.
    if (!isOriginAllowed(req.headers.get("origin"), bot.allowedDomains, new URL(req.url).origin)) {
      return error("This website isn't allowed to use this chatbot.", 403);
    }
    if (!row.ownerVerified) return error("This chatbot isn't active yet.", 403);

    const ip = ipKey(req);
    const [burst, visitorDay, ipDay] = await Promise.all([
      rateLimit(`chat:burst:${bot.id}:${ip}`, BURST_PER_MINUTE, 60),
      rateLimit(`chat:visitor:${bot.id}:${ip}:${input.visitorId}`, bot.visitorDailyLimit, DAY),
      // Several visitors can share one IP (offices, mobile carriers), so the per-IP cap is looser.
      rateLimit(`chat:ip:${bot.id}:${ip}`, bot.visitorDailyLimit * SHARED_IP_MULTIPLIER, DAY),
    ]);
    if (!burst.ok) {
      return tooManyRequests("You're sending messages too quickly. Please wait a moment.", burst.retryAfterSec, CORS_HEADERS);
    }
    if (!visitorDay.ok || !ipDay.ok) {
      return tooManyRequests(
        "You've reached today's message limit for this chat. Please come back tomorrow or contact us directly.",
        Math.max(visitorDay.retryAfterSec, ipDay.retryAfterSec),
        CORS_HEADERS,
      );
    }
  }

  const plan = getPlan(row.plan);
  if ((await monthlyMessageCount(bot.userId)) >= plan.messagesPerMonth) {
    return error("This chatbot has reached its monthly message limit. Please try again later.", 429);
  }

  // Reuse the conversation only if it belongs to this bot and visitor.
  let conversationId = input.conversationId ?? null;
  if (conversationId) {
    const [existing] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.botId, bot.id),
          eq(conversations.visitorId, input.visitorId),
        ),
      )
      .limit(1);
    if (!existing) conversationId = null;
  }
  if (!conversationId) {
    const [created] = await db
      .insert(conversations)
      .values({ botId: bot.id, visitorId: input.visitorId, source: input.source, pageUrl: input.pageUrl ?? null })
      .returning({ id: conversations.id });
    conversationId = created.id;
  }

  // History is read from the DB (never trusted from the client) before saving the new question.
  const history = await conversationHistory(conversationId);
  const lastUserTurn = [...history].reverse().find((t) => t.role === "user")?.content;

  let system: string;
  try {
    const context = await retrieveContext(bot, input.message, lastUserTurn);
    system = buildSystemPrompt(bot, context);
  } catch (err) {
    console.error("retrieval failed", err);
    return error(err instanceof MissingKeyError ? err.message : "The assistant is temporarily unavailable.", 502);
  }

  await db.insert(messages).values({
    conversationId,
    botId: bot.id,
    userId: bot.userId,
    role: "user",
    content: input.message,
  });

  const turns = [...history, { role: "user" as const, content: input.message }];
  const convId = conversationId;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let answer = "";
      try {
        for await (const token of streamChat(bot, system, turns)) {
          answer += token;
          controller.enqueue(encoder.encode(token));
        }
      } catch (err) {
        console.error("chat failed", err);
        const fallback = "\n\nSorry, something went wrong while answering. Please try again.";
        answer += fallback;
        controller.enqueue(encoder.encode(fallback));
      } finally {
        // Persist before closing: serverless hosts may freeze the function once the response ends.
        if (answer.trim()) {
          await db
            .insert(messages)
            .values({ conversationId: convId, botId: bot.id, userId: bot.userId, role: "assistant", content: answer })
            .catch((e) => console.error("save answer failed", e));
        }
        await db
          .update(conversations)
          .set({ lastMessageAt: sql`now()` })
          .where(eq(conversations.id, convId))
          .catch(() => {});
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Conversation-Id": convId,
    },
  });
}

export const OPTIONS = preflight;
