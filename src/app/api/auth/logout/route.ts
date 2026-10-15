import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

async function logout(req: Request) {
  await destroySession();
  const target = new URL(req.url).searchParams.get("next") === "login" ? "/login" : "/";
  return NextResponse.redirect(new URL(target, req.url), 303);
}

export const POST = logout;
// GET is used to clear stale sessions (e.g. the account was deleted).
export const GET = logout;
