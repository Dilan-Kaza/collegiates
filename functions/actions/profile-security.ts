"use server";

/**
 * Self-service account security for an already-signed-in user.
 *
 * @remarks
 * A password change takes effect immediately. An email change is
 * confirm-by-link, mirroring the activation flow, so an address is never moved
 * to somewhere the requester cannot prove they control.
 *
 * The email change is the one flow using a **stateless signed token**
 * ({@link "lib/signedToken"}) rather than the `VerificationToken` table that
 * backs activation and password reset — it has to carry the new address as well
 * as the user, and nothing needs persisting to trust it.
 *
 * @packageDocumentation
 */

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

/**
 * Changes the signed-in user's password.
 *
 * @remarks
 * The current password is re-verified even though the caller holds a valid
 * session, so a session left open on a shared machine cannot be used to seize
 * the account.
 *
 * Bumping `token_version` then revokes **every other session** — the one making
 * the change included, though it re-authenticates from the same cookie. A
 * notification goes to the account's address out of band.
 *
 * @returns A confirmation, or errors keyed to the individual fields.
 */
export async function changePassword(
  { old_password, new_password, confirm_password }: {
    /** The current password, re-verified even though a session is held. */
    old_password: string;
    /** The new password; at least 8 characters, and different from the old one. */
    new_password: string;
    /** Must match `new_password`. */
    confirm_password: string;
  },
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
    // Bumping token_version revokes every session issued before this change.
    data: { password: hashPassword(new_password), token_version: { increment: 1 } },
  });
  revalidateUserData(current.user_id);
  await sendEmail(current.email, passwordChangedNotificationEmail());

  return { data: { detail: "Password updated successfully." } };
}

/**
 * Starts an email change by sending a confirmation link to the new address.
 *
 * @remarks
 * Nothing is written. The signed token carries the `(user, new address)` pair
 * and expires in an hour, so the change only lands once the requester proves
 * they can read mail at the destination.
 *
 * The availability check here is advisory: the address could be taken in the
 * meantime, which {@link confirmEmailChange} catches on the unique index.
 *
 * @returns A confirmation that the email was sent, or a field error.
 */
export async function requestEmailChange({ new_email }: {
  /** The address to move to. */
  new_email: string;
}): Promise<Mutation<{ detail: string }>> {
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

/**
 * Completes an email change from its confirmation link.
 *
 * @remarks
 * Unauthenticated, because the link is opened in whatever browser reads the new
 * address's mail. The signature is the authorization.
 *
 * The old address is read before the update so the "your email changed"
 * notification can go **there**, which is the only warning an account owner gets
 * if someone else made the change.
 *
 * @returns A confirmation, or an error — including the address having been taken
 * since the request was made.
 */
export async function confirmEmailChange({ token }: {
  /** The signed token from the confirmation link. */
  token?: string;
}): Promise<Mutation<{ detail: string }>> {
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
