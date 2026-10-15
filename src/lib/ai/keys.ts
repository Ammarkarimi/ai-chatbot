import "server-only";
import type { Bot } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

export class MissingKeyError extends Error {}

/** A bot's own key wins; otherwise fall back to the platform key from env. */
export function geminiKeyFor(bot: Pick<Bot, "geminiApiKeyEnc">) {
  const key = bot.geminiApiKeyEnc ? decrypt(bot.geminiApiKeyEnc) : process.env.GEMINI_API_KEY;
  if (!key) throw new MissingKeyError("No Gemini API key configured (set GEMINI_API_KEY or add one to the bot).");
  return key;
}

export function groqKeyFor(bot: Pick<Bot, "groqApiKeyEnc">) {
  const key = bot.groqApiKeyEnc ? decrypt(bot.groqApiKeyEnc) : process.env.GROQ_API_KEY;
  if (!key) throw new MissingKeyError("No Groq API key configured (set GROQ_API_KEY or add one to the bot).");
  return key;
}

export const GEMINI_BASE = process.env.GEMINI_API_BASE ?? "https://generativelanguage.googleapis.com/v1beta";
export const GROQ_BASE = process.env.GROQ_API_BASE ?? "https://api.groq.com/openai/v1";
