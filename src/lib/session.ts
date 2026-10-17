import { SignJWT, jwtVerify } from "jose";

// Edge-safe session helpers (no DB access) so proxy.ts can use them.
export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) throw new Error("AUTH_SECRET must be set (16+ chars)");
  return new TextEncoder().encode(secret);
}

export async function signSession(userId: string) {
  // Millisecond issue time, so a password reset can revoke sessions created moments before it.
  return new SignJWT({ sub: userId, iatMs: Date.now() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export type SessionPayload = { userId: string; issuedAt: number /* ms */ };

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.iat !== "number") return null;
    const issuedAt = typeof payload.iatMs === "number" ? payload.iatMs : payload.iat * 1000;
    return { userId: payload.sub, issuedAt };
  } catch {
    return null;
  }
}
