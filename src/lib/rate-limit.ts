import "server-only";
import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { db, rateLimits } from "@/lib/db";

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSec: number };

/**
 * Fixed-window counter stored in Postgres, so limits hold across serverless instances.
 * One atomic upsert per check.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs);

  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1, expiresAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStart} = excluded.window_start then ${rateLimits.count} + 1 else 1 end`,
        windowStart: sql`excluded.window_start`,
        expiresAt: sql`excluded.expires_at`,
      },
    })
    .returning({ count: rateLimits.count });

  // Occasionally sweep expired windows so the table stays small.
  if (Math.random() < 0.01) {
    db.delete(rateLimits).where(lt(rateLimits.expiresAt, new Date())).catch(() => {});
  }

  return {
    ok: row.count <= limit,
    remaining: Math.max(0, limit - row.count),
    retryAfterSec: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)),
  };
}

/**
 * The visitor's IP, read from the header your hosting sets (CLIENT_IP_HEADER):
 * - Vercel (default, "x-forwarded-for"): Vercel overwrites it with the real IP, so it can't be faked.
 * - Behind Cloudflare: "cf-connecting-ip". Behind nginx/Caddy/a load balancer: whatever header it
 *   sets after replacing the client's own value (often "x-real-ip").
 * Never point this at a header the visitor can send themselves, or they can dodge per-IP limits.
 */
export function clientIp(req: Request) {
  const header = (process.env.CLIENT_IP_HEADER || "x-forwarded-for").toLowerCase();
  const value = req.headers.get(header);
  // X-Forwarded-For is "client, proxy1, proxy2"; the first entry is the client.
  return value?.split(",")[0]?.trim() || "unknown";
}

/** Keyed hash so raw IPs and emails never land in the rate_limits table. */
export function hashKey(value: string) {
  return createHash("sha256")
    .update(`${process.env.AUTH_SECRET ?? ""}:${value}`)
    .digest("base64url")
    .slice(0, 22);
}

export function ipKey(req: Request) {
  return hashKey(clientIp(req));
}

export function tooManyRequests(message: string, retryAfterSec: number, headers: Record<string, string> = {}) {
  return Response.json(
    { error: message },
    { status: 429, headers: { ...headers, "Retry-After": String(retryAfterSec) } },
  );
}
