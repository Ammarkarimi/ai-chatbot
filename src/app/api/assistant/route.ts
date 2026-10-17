import { z } from "zod";
import { defaultModel, streamWith, type ChatOptions } from "@/lib/ai/chat";
import { assistantSystemPrompt, CONTACT } from "@/lib/assistant";
import { APP_URL } from "@/lib/config";
import { ipKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const maxDuration = 60;

const BURST_PER_MINUTE = 8;
const PER_DAY = 60;
const MAX_TURNS = 12;

// The client sends the conversation so far; nothing is stored. Only the last few turns are used.
const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(50),
});

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** Groq is the fast, cheap default; Gemini is the fallback when no Groq key is configured. */
function provider(): ChatOptions | null {
  if (process.env.GROQ_API_KEY) {
    return { provider: "groq", model: defaultModel("groq"), temperature: 0.3, apiKey: process.env.GROQ_API_KEY };
  }
  if (process.env.GEMINI_API_KEY) {
    return { provider: "gemini", model: defaultModel("gemini"), temperature: 0.3, apiKey: process.env.GEMINI_API_KEY };
  }
  return null;
}

export async function POST(req: Request) {
  // Only our own pages may use the assistant (browsers always send Origin on POST).
  const origin = req.headers.get("origin");
  if (origin !== new URL(req.url).origin && origin !== new URL(APP_URL).origin) return error("Not allowed", 403);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Invalid request", 400);
  const turns = parsed.data.messages.slice(-MAX_TURNS);
  const question = turns[turns.length - 1];
  if (question.role !== "user" || question.content.length > 1000) return error("Please ask a shorter question.", 400);

  const options = provider();
  if (!options) return error("The assistant isn't configured yet.", 503);

  const ip = ipKey(req);
  const [burst, day] = await Promise.all([
    rateLimit(`assistant:burst:${ip}`, BURST_PER_MINUTE, 60),
    rateLimit(`assistant:day:${ip}`, PER_DAY, 24 * 60 * 60),
  ]);
  if (!burst.ok) return tooManyRequests("You're sending messages too quickly. Please wait a moment.", burst.retryAfterSec);
  if (!day.ok) {
    return tooManyRequests(
      `You've reached today's limit for this chat. You can reach us at ${CONTACT.email} or ${CONTACT.phone}.`,
      day.retryAfterSec,
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const token of streamWith(options, assistantSystemPrompt(), turns)) {
          controller.enqueue(encoder.encode(token));
        }
      } catch (err) {
        console.error("assistant failed", err);
        controller.enqueue(
          encoder.encode(`\n\nSorry, something went wrong. Please try again, or email us at ${CONTACT.email}.`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
  });
}
