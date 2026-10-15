import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, bots } from "@/lib/db";
import { CORS_HEADERS, preflight } from "@/lib/cors";

type Ctx = { params: Promise<{ botId: string }> };

const UUID = /^[0-9a-f-]{36}$/i;

/** Appearance config the widget loader needs before the iframe opens. */
export async function GET(_req: Request, { params }: Ctx) {
  const { botId } = await params;
  if (!UUID.test(botId)) return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS_HEADERS });

  const [bot] = await db
    .select({ name: bots.name, primaryColor: bots.primaryColor, position: bots.position })
    .from(bots)
    .where(eq(bots.id, botId))
    .limit(1);
  if (!bot) return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS_HEADERS });

  return NextResponse.json(bot, { headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=60" } });
}

export const OPTIONS = preflight;
