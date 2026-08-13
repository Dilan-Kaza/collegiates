"use server";

/**
 * Password recovery: request a reset link, then redeem it to set a new password.
 *
 * @remarks
 * Both actions are necessarily unauthenticated — someone who cannot sign in is
 * exactly who needs them — so both are written to leak nothing about which
 * addresses have accounts.
 *
 * @packageDocumentation
 */

import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail, passwordChangedNotificationEmail } from "@/lib/email-templates";
import { issueToken, consumeToken, TokenPurpose } from "@/lib/tokens";
import { appUrl } from "./shared";
import type { Mutation } from "./shared";

/**
 * Emails a password-reset link, if the address has an account.
 *
 * @remarks
 * Always returns the **same generic response** whether or not the address
 * matched, so this cannot be used to enumerate registered addresses. The link
 * carries a one-hour single-use token.
 *
 */
export async function requestPasswordReset({ email }: {
  /** The address to send to. */
  email: string;
}): Promise<Mutation<{ detail: string }>> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { user_id: true, email: true } });
  if (user) {
    const token = await issueToken(user.user_id, TokenPurpose.PasswordReset);
    const link = `${appUrl()}/reset-password/${user.user_id}/${token}`;
    await sendEmail(user.email, passwordResetEmail(link));
  }
  return { data: { detail: "If an account with that email exists, a reset link was sent." } };
}

/**
 * Redeems a reset link and sets a new password.
 *
 * @remarks
 * Bumping `token_version` revokes **every session issued before this reset**, on
 * every device — `getCurrentUser` compares the column against the value embedded
 * in each request's session. A reset should evict a stolen session just as
 * effectively as an in-app password change does, so this matches
 * `changePassword`.
 *
 * A notification then goes to the account's address, out of band, so a reset the
 * owner did not request is visible to them.
 *
 * @returns A confirmation, or one generic error covering every failure mode.
 */
export async function resetPassword(
  { uid, token, password }: {
    /** The user id from the link. */
    uid: string;
    /** The raw token from the link. */
    token: string;
    /** The new password; at least 8 characters. */
    password: string;
  },
): Promise<Mutation<{ detail: string }>> {
  if (!password || password.length < 8) return { error: { detail: "Password must be at least 8 characters" } };

  const ok = await consumeToken(uid, token, TokenPurpose.PasswordReset);
  if (!ok) return { error: { detail: "This reset link is invalid or has expired." } };

  const user = await prisma.user.update({
    where: { user_id: uid },
    data: { password: hashPassword(password), token_version: { increment: 1 } },
  });
  await sendEmail(user.email, passwordChangedNotificationEmail());
  return { data: { detail: "Password updated." } };
}
