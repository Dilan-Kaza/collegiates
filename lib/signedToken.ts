import crypto from "crypto";

// Stateless, HMAC-signed token carrying the (userId, newEmail) pair for the
// email-change confirmation link. Unlike the VerificationToken-backed tokens
// in lib/tokens.ts, nothing is persisted on request — the signature and the
// embedded expiry are all that's needed to trust the link, so requesting a
// change never touches the database. The tradeoff: a still-outstanding link
// from an earlier request isn't invalidated by a newer request, only by its
// own expiry.

const TTL_MS = 60 * 60 * 1000; // 1h, matching the password-reset link lifetime

interface EmailChangePayload {
  uid: string;
  email: string;
  exp: number;
}

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set.");
  return value;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

export function signEmailChangeToken({ uid, email }: { uid: string; email: string }): string {
  const payload: EmailChangePayload = { uid, email, exp: Date.now() + TTL_MS };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyEmailChangeToken(token: string): { uid: string; email: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;

  const expected = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload: EmailChangePayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload.uid || !payload.email || typeof payload.exp !== "number") return null;
  if (payload.exp < Date.now()) return null;

  return { uid: payload.uid, email: payload.email };
}
