import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, bots } from "@/lib/db";
import { frameAncestors } from "@/lib/domains";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Allowed-domain lists rarely change; cache briefly so every chat open doesn't hit the database.
const CACHE_MS = 30_000;
const domainCache = new Map<string, { domains: string[] | null; at: number }>();

async function allowedDomainsFor(botId: string) {
  const cached = domainCache.get(botId);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.domains;
  const [bot] = await db.select({ domains: bots.allowedDomains }).from(bots).where(eq(bots.id, botId)).limit(1);
  const domains = bot?.domains ?? null;
  if (domainCache.size > 5000) domainCache.clear();
  domainCache.set(botId, { domains, at: Date.now() });
  return domains;
}

/** The browser itself refuses to show the chat iframe on websites outside the bot's allow-list. */
async function embed(req: NextRequest, botId: string) {
  const res = NextResponse.next();
  if (!/^[0-9a-f-]{36}$/i.test(botId)) return res;
  const domains = await allowedDomainsFor(botId).catch(() => null);
  if (domains && domains.length > 0) {
    res.headers.set("Content-Security-Policy", `frame-ancestors ${frameAncestors(domains)}`);
  }
  return res;
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/embed/")) return embed(req, pathname.split("/")[2] ?? "");

  // Optimistic auth check; pages and API routes still verify the user themselves.
  const userId = (await verifySession(req.cookies.get(SESSION_COOKIE)?.value))?.userId;
  if (pathname.startsWith("/dashboard") && !userId) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if ((pathname === "/login" || pathname === "/signup") && userId) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/embed/:path*"],
};
