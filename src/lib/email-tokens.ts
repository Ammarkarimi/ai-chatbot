import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, emailTokens, users, type User } from "@/lib/db";
import { APP_NAME, APP_URL } from "@/lib/config";
import { actionEmail, sendEmail } from "@/lib/email";

type TokenType = "verify_email" | "reset_password";

const TTL_MS: Record<TokenType, number> = {
  verify_email: 24 * 60 * 60 * 1000,
  reset_password: 60 * 60 * 1000,
};

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

async function issueToken(userId: string, type: TokenType) {
  // Only the newest link of each kind stays valid.
  await db
    .update(emailTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(emailTokens.userId, userId), eq(emailTokens.type, type), isNull(emailTokens.usedAt)));
  const token = randomBytes(32).toString("base64url");
  await db.insert(emailTokens).values({
    userId,
    type,
    tokenHash: hash(token),
    expiresAt: new Date(Date.now() + TTL_MS[type]),
  });
  return token;
}

/** Atomically marks a valid, unused, unexpired token as used. Returns the user id or null. */
export async function consumeToken(token: string, type: TokenType): Promise<string | null> {
  if (!token || token.length > 100) return null;
  const [row] = await db
    .update(emailTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(emailTokens.tokenHash, hash(token)),
        eq(emailTokens.type, type),
        isNull(emailTokens.usedAt),
        gt(emailTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: emailTokens.userId });
  return row?.userId ?? null;
}

/** Read-only check, used to show "link expired" before the user types a new password. */
export async function isTokenValid(token: string, type: TokenType) {
  if (!token || token.length > 100) return false;
  const [row] = await db
    .select({ id: emailTokens.id })
    .from(emailTokens)
    .where(
      and(
        eq(emailTokens.tokenHash, hash(token)),
        eq(emailTokens.type, type),
        isNull(emailTokens.usedAt),
        gt(emailTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function sendVerificationEmail(user: Pick<User, "id" | "email" | "name">) {
  const token = await issueToken(user.id, "verify_email");
  const url = `${APP_URL}/api/auth/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: `Confirm your email for ${APP_NAME}`,
    ...actionEmail({
      heading: `Welcome, ${user.name.split(" ")[0]}!`,
      body: "Please confirm your email address. Your chatbots go live on your website once your email is verified.",
      button: "Verify email",
      url,
      footer: "This link expires in 24 hours. If you didn't create an account, you can ignore this email.",
    }),
  });
}

export async function sendPasswordResetEmail(user: Pick<User, "id" | "email">) {
  const token = await issueToken(user.id, "reset_password");
  const url = `${APP_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: `Reset your ${APP_NAME} password`,
    ...actionEmail({
      heading: "Reset your password",
      body: "We received a request to reset your password. Click the button below to choose a new one.",
      button: "Choose a new password",
      url,
      footer: "This link expires in 1 hour and can only be used once. If you didn't ask for this, you can ignore this email; your password won't change.",
    }),
  });
}

export async function markEmailVerified(userId: string) {
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)));
}
