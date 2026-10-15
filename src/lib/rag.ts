import "server-only";
import { cosineDistance, desc, eq } from "drizzle-orm";
import { db, chunks, documents, messages, type Bot } from "@/lib/db";
import { chunkText } from "@/lib/ai/chunk";
import { embedTexts } from "@/lib/ai/embeddings";
import { geminiKeyFor } from "@/lib/ai/keys";
import type { ChatTurn } from "@/lib/ai/chat";

export const MAX_DOCUMENT_CHARS = 2_000_000;
const TOP_K = 6;
const HISTORY_TURNS = 10;

/**
 * Chunks and embeds text for a document row that was already inserted with
 * status "processing", then marks it ready (or error).
 */
export async function ingestDocument(bot: Bot, documentId: string, text: string) {
  try {
    const trimmed = text.slice(0, MAX_DOCUMENT_CHARS);
    const pieces = chunkText(trimmed);
    if (pieces.length === 0) throw new Error("No readable text found in this file. Scanned PDFs need OCR first.");

    const vectors = await embedTexts(pieces, geminiKeyFor(bot), "RETRIEVAL_DOCUMENT");
    const rows = pieces.map((content, position) => ({
      documentId,
      botId: bot.id,
      position,
      content,
      embedding: vectors[position],
    }));

    await db.transaction(async (tx) => {
      for (let i = 0; i < rows.length; i += 200) {
        await tx.insert(chunks).values(rows.slice(i, i + 200));
      }
      await tx
        .update(documents)
        .set({ status: "ready", charCount: trimmed.length, chunkCount: rows.length, error: null })
        .where(eq(documents.id, documentId));
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(documents)
      .set({ status: "error", error: message.slice(0, 500) })
      .where(eq(documents.id, documentId));
    throw err;
  }
}

async function searchChunks(botId: string, vector: number[]) {
  const distance = cosineDistance(chunks.embedding, vector);
  return db
    .select({ id: chunks.id, content: chunks.content, documentName: documents.name, distance })
    .from(chunks)
    .innerJoin(documents, eq(chunks.documentId, documents.id))
    .where(eq(chunks.botId, botId))
    .orderBy(distance)
    .limit(TOP_K);
}

/**
 * Finds the passages most relevant to the question. When there's a previous
 * question, a second search on both combined helps follow-ups ("how much is it?"),
 * but matches for the current question alone always rank first.
 */
export async function retrieveContext(bot: Bot, question: string, previousQuestion?: string) {
  const queries = previousQuestion ? [question, `${previousQuestion}\n${question}`] : [question];
  const vectors = await embedTexts(queries, geminiKeyFor(bot), "RETRIEVAL_QUERY");
  const [primary, combined = []] = await Promise.all(vectors.map((v) => searchChunks(bot.id, v)));

  const seen = new Set<string>();
  return [...primary.slice(0, TOP_K - 2), ...combined, ...primary.slice(TOP_K - 2)]
    .filter((c) => !seen.has(c.id) && seen.add(c.id))
    .slice(0, TOP_K);
}

export async function conversationHistory(conversationId: string): Promise<ChatTurn[]> {
  const rows = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(HISTORY_TURNS);
  return rows.reverse();
}

export function buildSystemPrompt(bot: Bot, context: { content: string; documentName: string }[]) {
  const sources = context.length
    ? context.map((c, i) => `[${i + 1}] (from "${c.documentName}")\n${c.content}`).join("\n\n---\n\n")
    : "(No knowledge base content matched this question.)";

  return [
    `You are "${bot.name}", a helpful assistant embedded on a website.`,
    "Answer visitor questions using the knowledge base excerpts below.",
    "If the answer is not in the excerpts, say you don't have that information and suggest contacting the team directly. Never invent facts, prices, policies or links.",
    "Be concise and friendly. Use Markdown (short lists, **bold**) when it helps readability. Do not mention 'excerpts' or 'context' to the visitor.",
    bot.instructions.trim() ? `\nAdditional instructions from the business:\n${bot.instructions.trim()}` : "",
    `\nKnowledge base excerpts:\n${sources}`,
  ]
    .filter(Boolean)
    .join("\n");
}
