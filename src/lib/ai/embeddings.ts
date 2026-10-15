import "server-only";
import { EMBEDDING_DIMENSIONS } from "@/lib/db/schema";
import { GEMINI_BASE } from "./keys";

const MODEL = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";
const BATCH_SIZE = 100; // Gemini batchEmbedContents limit

type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

// Gemini only pre-normalizes full-size vectors; truncated ones must be normalized for cosine search.
function normalize(v: number[]) {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

async function fetchWithRetry(url: string, init: RequestInit, attempts = 5): Promise<Response> {
  for (let i = 0; ; i++) {
    const res = await fetch(url, init);
    if ((res.status === 429 || res.status >= 500) && i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
      continue;
    }
    return res;
  }
}

export async function embedTexts(texts: string[], apiKey: string, taskType: TaskType): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const res = await fetchWithRetry(`${GEMINI_BASE}/models/${MODEL}:batchEmbedContents`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        requests: batch.map((text) => ({
          model: `models/${MODEL}`,
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: EMBEDDING_DIMENSIONS,
        })),
      }),
    });
    if (!res.ok) throw new Error(`Gemini embeddings failed (${res.status}): ${await res.text()}`);
    const data = (await res.json()) as { embeddings: { values: number[] }[] };
    out.push(...data.embeddings.map((e) => normalize(e.values)));
  }
  return out;
}
