import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, bots, users } from "@/lib/db";
import { CORS_HEADERS, preflight } from "@/lib/cors";
import { isOriginAllowed } from "@/lib/domains";

type Ctx = { params: Promise<{ botId: string }> };

const UUID = /^[0-9a-f-]{36}$/i;
// The answer depends on the requesting site, so caches must key on Origin.
const HEADERS = { ...CORS_HEADERS, Vary: "Origin" };

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: HEADERS });
}

/** Appearance config the widget loader needs; also tells it whether this website may show the bot. */
export async function GET(req: Request, { params }: Ctx) {
  const { botId } = await params;
  if (!UUID.test(botId)) return fail("Chatbot not found", 404);

  const [row] = await db
    .select({
      name: bots.name,
      primaryColor: bots.primaryColor,
      position: bots.position,
      allowedDomains: bots.allowedDomains,
      ownerVerified: users.emailVerifiedAt,
    })
    .from(bots)
    .innerJoin(users, eq(bots.userId, users.id))
    .where(eq(bots.id, botId))
    .limit(1);
  if (!row) return fail("Chatbot not found", 404);
  if (row.allowedDomains.length === 0) {
    return fail("This chatbot isn't live yet: add your website's domain in the chatbot's Settings → Website security.", 403);
  }
  if (!isOriginAllowed(req.headers.get("origin"), row.allowedDomains)) {
    return fail("This website isn't in the chatbot's list of allowed websites.", 403);
  }
  if (!row.ownerVerified) return fail("This chatbot isn't active yet: the owner needs to verify their email.", 403);

  const { name, primaryColor, position } = row;
  return NextResponse.json(
    { name, primaryColor, position },
    { headers: { ...HEADERS, "Cache-Control": "public, max-age=60" } },
  );
}

export const OPTIONS = preflight;
