import crypto from "crypto";
import { TokenPurpose } from "@prisma/client";
import prisma from "./prisma";

/**
 * Single-use tokens backing account activation and password reset.
 *
 * @remarks
 * Only the sha256 hash of the raw token is ever persisted — the raw value
 * exists solely inside the emailed link. A plain hash is enough here, unlike
 * for passwords: the token is 256 bits from `crypto.randomBytes`, so there is
 * no dictionary to attack offline and no need for a slow KDF.
 *
 * For the *email-change* link see {@link "lib/signedToken"}, which is stateless
 * and touches no table.
 *
 * @packageDocumentation
 */

/**
 * Why a token was issued: `Activation`, `PasswordReset`, or `SchoolInvite` —
 * the link that both sets a school account's first password and activates it.
 *
 * @remarks
 * Re-exported from the generated client, so the purposes are the database's
 * `token_purpose` enum rather than a parallel list that could drift from it.
 * Prisma reads and writes the member *names*; the stored codes stay `"A"`,
 * `"P"`, and `"S"` through the `@map`s in the schema.
 */
export { TokenPurpose };

const TTL_MS: Record<TokenPurpose, number> = {
  [TokenPurpose.Activation]: 24 * 60 * 60 * 1000, // 24h
  [TokenPurpose.PasswordReset]: 60 * 60 * 1000, // 1h
  // Longer than the rest: an admin creates the account, so the recipient was
  // not sitting at a form waiting for the mail to arrive.
  [TokenPurpose.SchoolInvite]: 7 * 24 * 60 * 60 * 1000, // 7d
};

const hash = (raw: string): string => crypto.createHash("sha256").update(raw).digest("hex");

/**
 * Issues a fresh single-use token for a user, retiring any outstanding one of
 * the same purpose.
 *
 * @remarks
 * Requesting a new link invalidates the previous one, so a reset link that was
 * intercepted stops working the moment the real owner asks for another.
 * Activation tokens live 24 hours, password-reset tokens one hour.
 *
 * @param userId - Who the token is for.
 * @param purpose - Activation or password reset.
 * @returns The **raw** token. Put it in the emailed link and discard it — only
 * its hash is stored, so it cannot be recovered afterwards.
 */
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

/**
 * Redeems a raw token, marking it used.
 *
 * @remarks
 * The claim *is* the check: `used_at: null` sits in the `WHERE` of a single
 * `updateMany`, so Postgres picks one winner and a link submitted twice — a
 * double-click, an email scanner prefetching it — cannot be redeemed twice.
 *
 * @param userId - The user the link claims to be for.
 * @param rawToken - The token from the link.
 * @param purpose - Activation or password reset; a token is not valid for the other.
 * @returns `true` only if the token existed, matched, was unused, and had not
 * expired. Missing, mismatched, expired, and already-used are all `false` —
 * deliberately indistinguishable to the caller.
 */
export async function consumeToken(userId: string, rawToken: string, purpose: TokenPurpose): Promise<boolean> {
  if (!rawToken) return false;
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
