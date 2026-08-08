"use server";

// Password recovery server actions: request a reset link, then consume it to
// set a new password.

import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail, passwordChangedNotificationEmail } from "@/lib/email-templates";
import { issueToken, consumeToken } from "@/lib/tokens";
import { appUrl } from "./shared";
import type { Mutation } from "./shared";

// Always returns the same generic response regardless of whether the email
// matched an account, so this can't be used to enumerate registered addresses.
export async function requestPasswordReset({ email }: { email: string }): Promise<Mutation<{ detail: string }>> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { user_id: true, email: true } });
  if (user) {
    const token = await issueToken(user.user_id, "P");
    const link = `${appUrl()}/reset-password/${user.user_id}/${token}`;
    await sendEmail(user.email, passwordResetEmail(link));
  }
  return { data: { detail: "If an account with that email exists, a reset link was sent." } };
}

export async function resetPassword(
  { uid, token, password }: { uid: string; token: string; password: string },
): Promise<Mutation<{ detail: string }>> {
  if (!password || password.length < 8) return { error: { detail: "Password must be at least 8 characters" } };

  const ok = await consumeToken(uid, token, "P");
  if (!ok) return { error: { detail: "This reset link is invalid or has expired." } };

  // Bumping token_version invalidates any session issued before this reset —
  // see lib/auth.ts's getCurrentUser(), which compares it against the value
  // embedded in the caller's own session on every request. Matches
  // changePassword's behavior in profile-security.ts: a password reset should
  // revoke stolen sessions just as effectively as an in-app password change.
  const user = await prisma.user.update({
    where: { user_id: uid },
    data: { password: hashPassword(password), token_version: { increment: 1 } },
  });
  await sendEmail(user.email, passwordChangedNotificationEmail());
  return { data: { detail: "Password updated." } };
}
