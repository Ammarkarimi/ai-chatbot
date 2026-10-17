import { NextResponse } from "next/server";
import { consumeToken, markEmailVerified } from "@/lib/email-tokens";

// Linked from the verification email. Safe if a mail scanner opens it first: verifying is idempotent.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const userId = await consumeToken(token, "verify_email");
  if (!userId) return NextResponse.redirect(new URL("/verify-email?status=invalid", req.url), 303);
  await markEmailVerified(userId);
  return NextResponse.redirect(new URL("/verify-email?status=success", req.url), 303);
}
