import "server-only";
import type { Bot } from "@/lib/db";
import { GEMINI_BASE, GROQ_BASE, geminiKeyFor, groqKeyFor } from "./keys";

export type ChatTurn = { role: "user" | "assistant"; content: string };

/** Everything a provider call needs, so callers without a bot (the site assistant) can stream too. */
export type ChatOptions = { provider: Bot["provider"]; model: string; temperature: number; apiKey: string };

export function defaultModel(provider: Bot["provider"]) {
  return provider === "groq"
    ? (process.env.GROQ_CHAT_MODEL ?? "openai/gpt-oss-120b")
    : (process.env.GEMINI_CHAT_MODEL ?? "gemini-3.5-flash");
}

/** Parses a server-sent-events body, yielding each `data:` payload. */
async function* sseData(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line.startsWith("data:")) yield line.slice(5).trim();
    }
  }
  if (buffer.trim().startsWith("data:")) yield buffer.trim().slice(5).trim();
}

async function* streamGroq(o: ChatOptions, system: string, turns: ChatTurn[]) {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${o.apiKey}` },
    body: JSON.stringify({
      model: o.model,
      temperature: o.temperature,
      max_tokens: 1024,
      stream: true,
      messages: [{ role: "system", content: system }, ...turns],
    }),
  });
  if (!res.ok || !res.body) throw new Error(`Groq chat failed (${res.status}): ${await res.text()}`);
  for await (const data of sseData(res.body)) {
    if (data === "[DONE]") return;
    const json = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
    const text = json.choices?.[0]?.delta?.content;
    if (text) yield text;
  }
}

async function* streamGemini(o: ChatOptions, system: string, turns: ChatTurn[]) {
  const res = await fetch(`${GEMINI_BASE}/models/${o.model}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": o.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: turns.map((t) => ({
        role: t.role === "assistant" ? "model" : "user",
        parts: [{ text: t.content }],
      })),
      generationConfig: { temperature: o.temperature, maxOutputTokens: 1024 },
    }),
  });
  if (!res.ok || !res.body) throw new Error(`Gemini chat failed (${res.status}): ${await res.text()}`);
  for await (const data of sseData(res.body)) {
    const json = JSON.parse(data) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    for (const part of json.candidates?.[0]?.content?.parts ?? []) {
      if (part.text) yield part.text;
    }
  }
}

export function streamWith(o: ChatOptions, system: string, turns: ChatTurn[]) {
  return o.provider === "groq" ? streamGroq(o, system, turns) : streamGemini(o, system, turns);
}

export function streamChat(bot: Bot, system: string, turns: ChatTurn[]) {
  const apiKey = bot.provider === "groq" ? groqKeyFor(bot) : geminiKeyFor(bot);
  return streamWith(
    { provider: bot.provider, model: bot.model || defaultModel(bot.provider), temperature: bot.temperature, apiKey },
    system,
    turns,
  );
}
