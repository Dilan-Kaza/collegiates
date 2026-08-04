"use server";

// Self-service account security for an already-signed-in user: change
// password (immediate) and change email (confirm-by-link, mirroring the
// activation flow). See requestEmailChange/confirmEmailChange for why the
// email change uses a stateless signed token instead of the VerificationToken
// table used by activation/password-reset.

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import {
  emailChangeConfirmationEmail, emailChangedNotificationEmail, passwordChangedNotificationEmail,
} from "@/lib/email-templates";
import { signEmailChangeToken, verifyEmailChangeToken } from "@/lib/signedToken";
import { revalidateUserData, appUrl } from "./shared";
import type { Mutation } from "./shared";

export async function changePassword(
  { old_password, new_password, confirm_password }: { old_password: string; new_password: string; confirm_password: string },
): Promise<Mutation<{ detail: string }>> {
  const current = await getCurrentUser();
  if (!current) return { error: { detail: "Not authenticated." } };

  if (!old_password) return { error: { old_password: "Current password is required" } };
  if (!new_password || new_password.length < 8) return { error: { new_password: "Password must be at least 8 characters" } };
  if (new_password !== confirm_password) return { error: { confirm_password: "Passwords do not match" } };
  if (new_password === old_password) return { error: { new_password: "New password must be different from the current password" } };

  if (!verifyPassword(old_password, current.password)) {
    return { error: { old_password: "Current password is incorrect." } };
  }

  await prisma.user.update({
    where: { user_id: current.user_id },
    // Bumping token_version invalidates any other session's token — see
    // lib/auth.ts's getCurrentUser(), which compares this against the value
    // embedded in the caller's own session on every request.
    data: { password: hashPassword(new_password), token_version: { increment: 1 } },
  });
  revalidateUserData(current.user_id);
  await sendEmail(current.email, passwordChangedNotificationEmail());

  return { data: { detail: "Password updated successfully." } };
}

export async function requestEmailChange({ new_email }: { new_email: string }): Promise<Mutation<{ detail: string }>> {
  const current = await getCurrentUser();
  if (!current) return { error: { detail: "Not authenticated." } };

  const normalized = (new_email ?? "").trim().toLowerCase();
  if (!normalized) return { error: { email: "Email is required" } };
  if (!/\S+@\S+\.\S+/.test(normalized)) return { error: { email: "Invalid email address" } };
  if (normalized === current.email) return { error: { email: "This is already your current email." } };

  const existing = await prisma.user.findUnique({ where: { email: normalized }, select: { user_id: true } });
  if (existing) return { error: { email: "This email is already associated with an account." } };

  const token = signEmailChangeToken({ uid: current.user_id, email: normalized });
  const link = `${appUrl()}/confirm-email-change/${token}`;
  await sendEmail(normalized, emailChangeConfirmationEmail(link));

  return { data: { detail: "Confirmation email sent to your new address." } };
}

export async function confirmEmailChange({ token }: { token?: string }): Promise<Mutation<{ detail: string }>> {
  const payload = token ? verifyEmailChangeToken(token) : null;
  if (!payload) return { error: { detail: "This confirmation link is invalid or has expired." } };

  const user = await prisma.user.findUnique({ where: { user_id: payload.uid }, select: { email: true } });
  if (!user) return { error: { detail: "This confirmation link is invalid or has expired." } };

  try {
    await prisma.user.update({ where: { user_id: payload.uid }, data: { email: payload.email } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: { detail: "That email is no longer available. Please request the change again." } };
    }
    throw err;
  }

  revalidateUserData(payload.uid);
  await sendEmail(user.email, emailChangedNotificationEmail(payload.email));

  return { data: { detail: "Your email has been updated." } };
}
