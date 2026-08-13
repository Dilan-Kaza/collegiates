import crypto from "crypto";

/**
 * Stateless HMAC-signed tokens for the email-change confirmation link.
 *
 * @remarks
 * The token carries the `(userId, newEmail)` pair itself, so requesting an
 * email change never touches the database: the signature and the embedded
 * expiry are all that is needed to trust the link when it comes back.
 *
 * That is the difference from {@link "lib/tokens"}, which persists a row per
 * token. The tradeoff is that a still-outstanding link from an earlier request
 * is **not** invalidated by a newer request — only by its own expiry, one hour
 * out. Acceptable here because redeeming the link proves control of the new
 * address and changes nothing else.
 *
 * @packageDocumentation
 */

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

/**
 * Signs an email-change confirmation token.
 *
 * @returns `<base64url payload>.<base64url HMAC>`, valid for one hour. Safe to
 * put in a URL; it is signed, not encrypted, so treat the address inside as
 * readable by whoever holds the link.
 */
export function signEmailChangeToken({ uid, email }: {
  /** The user requesting the change. */
  uid: string;
  /** The address they want to move to. */
  email: string;
}): string {
  const payload: EmailChangePayload = { uid, email, exp: Date.now() + TTL_MS };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * Verifies an email-change token and unpacks it.
 *
 * @remarks
 * The signature is compared with `timingSafeEqual`, and the payload is only
 * parsed once the signature holds — so a forged token never reaches `JSON.parse`.
 *
 * @param token - The value from the confirmation link.
 * @returns The `(uid, email)` pair, or `null` for a malformed, mis-signed, or
 * expired token. The caller cannot tell those apart, by design.
 */
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
