import crypto from "crypto";
import prisma from "./prisma";

// Single-use tokens backing account activation and password reset. Only the
// sha256 hash of the raw token is ever persisted (the raw value has 256 bits
// of entropy from crypto.randomBytes, so a hash lookup is safe — unlike
// passwords there is no dictionary to attack offline).

export type TokenPurpose = "A" | "P"; // activation | password reset

const TTL_MS: Record<TokenPurpose, number> = {
  A: 24 * 60 * 60 * 1000, // 24h
  P: 60 * 60 * 1000, // 1h
};

const hash = (raw: string): string => crypto.createHash("sha256").update(raw).digest("hex");

// Invalidates any outstanding tokens of this purpose for the user, then issues
// a fresh one. Returns the raw token — only ever sent in the email link, never
// stored.
export async function issueToken(userId: string, purpose: TokenPurpose): Promise<string> {
  await prisma.verificationToken.updateMany({
    where: { user_id: userId, purpose, used_at: null },
    data: { used_at: new Date() },
  });

  const raw = crypto.randomBytes(32).toString("base64url");
  await prisma.verificationToken.create({
    data: {
      user_id: userId,
      token_hash: hash(raw),
      purpose,
      expires_at: new Date(Date.now() + TTL_MS[purpose]),
    },
  });
  return raw;
}

// Verifies a raw token against the stored hash for (userId, purpose), marking
// it used on success. Returns false for a missing, mismatched, expired, or
// already-used token.
export async function consumeToken(userId: string, rawToken: string, purpose: TokenPurpose): Promise<boolean> {
  if (!rawToken) return false;
  // The claim IS the check: `used_at: null` sits in the WHERE, so Postgres picks one
  // winner and a link submitted twice can't be redeemed twice.
  const { count } = await prisma.verificationToken.updateMany({
    where: {
      token_hash: hash(rawToken),
      user_id: userId,
      purpose,
      used_at: null,
      expires_at: { gt: new Date() },
    },
    data: { used_at: new Date() },
  });
  return count === 1;
}
