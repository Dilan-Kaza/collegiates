import type { EmailContent } from "./email";

/**
 * Bodies for every transactional email the site sends.
 *
 * @remarks
 * Each builder returns both an HTML and a plain-text part: SES's
 * `SendEmailCommand` takes both, and mail providers weight HTML-only messages
 * as more spam-like.
 *
 * Interpolated values are server-generated (a signed link, event names from the
 * catalogue) and carry no attacker-controlled markup — with one exception, a
 * user-submitted email address, which goes through `escapeHtml`.
 *
 * @packageDocumentation
 */

// Escapes untrusted values before they are interpolated into an HTML body.
const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const wrap = (title: string, body: string): string => `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 16px">${title}</h2>
  ${body}
  <p style="margin-top:32px;color:#888;font-size:12px">Collegiates</p>
</div>`;

/**
 * The account-activation email sent at sign-up.
 *
 * @param link - The activation URL, carrying a 24-hour token from
 * {@link "lib/tokens"}. The expiry stated in the body must match that TTL.
 */
export function activationEmail(link: string): EmailContent {
  return {
    subject: "Confirm your Collegiates account",
    html: wrap(
      "Confirm your email",
      `<p>Thanks for signing up. Click below to activate your account:</p>
       <p><a href="${link}" style="color:#2563eb">${link}</a></p>
       <p>This link expires in 24 hours.</p>`,
    ),
    text: `Confirm your email: ${link}\n\nThis link expires in 24 hours.`,
  };
}

/**
 * The password-reset email.
 *
 * @param link - The reset URL, carrying a one-hour token from {@link "lib/tokens"}.
 */
export function passwordResetEmail(link: string): EmailContent {
  return {
    subject: "Reset your Collegiates password",
    html: wrap(
      "Reset your password",
      `<p>We received a request to reset your password. Click below to choose a new one:</p>
       <p><a href="${link}" style="color:#2563eb">${link}</a></p>
       <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
    ),
    text: `Reset your password: ${link}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
  };
}

/**
 * Sent to the **new** address, to prove the requester controls it.
 *
 * @param link - The confirmation URL, carrying a one-hour signed token from
 * {@link "lib/signedToken"}.
 */
export function emailChangeConfirmationEmail(link: string): EmailContent {
  return {
    subject: "Confirm your new Collegiates email",
    html: wrap(
      "Confirm your new email",
      `<p>We received a request to change the email on your Collegiates account to this address. Click below to confirm:</p>
       <p><a href="${link}" style="color:#2563eb">${link}</a></p>
       <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
    ),
    text: `Confirm your new email: ${link}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
  };
}

/**
 * Sent to the **old** address once an email change completes, so a hijacked
 * account still surfaces the change somewhere its owner can see it.
 *
 * @param newEmail - The address moved to. User-supplied, so it is HTML-escaped.
 */
export function emailChangedNotificationEmail(newEmail: string): EmailContent {
  return {
    subject: "Your Collegiates account email was changed",
    html: wrap(
      "Email address changed",
      `<p>The email on your Collegiates account was changed to <strong>${escapeHtml(newEmail)}</strong>.</p>
       <p>If you didn't request this, please contact us immediately.</p>`,
    ),
    text: `The email on your Collegiates account was changed to ${newEmail}.\n\nIf you didn't request this, please contact us immediately.`,
  };
}

/**
 * Sent after a password change or reset, as an out-of-band warning that the
 * credential moved.
 */
export function passwordChangedNotificationEmail(): EmailContent {
  return {
    subject: "Your Collegiates password was changed",
    html: wrap(
      "Password changed",
      `<p>The password on your Collegiates account was just changed.</p>
       <p>If you didn't request this, please contact us immediately.</p>`,
    ),
    text: `The password on your Collegiates account was just changed.\n\nIf you didn't request this, please contact us immediately.`,
  };
}

/**
 * The receipt sent once event registrations are written.
 *
 * @param eventNames - Display names of the events registered for, in the order
 * they were submitted.
 */
export function registrationConfirmedEmail(eventNames: string[]): EmailContent {
  const items = eventNames.map((n) => `<li>${n}</li>`).join("");
  return {
    subject: "Your event registration is confirmed",
    html: wrap(
      "Registration confirmed",
      `<p>You're registered for the following events:</p>
       <ul>${items}</ul>`,
    ),
    text: `You're registered for the following events:\n${eventNames.map((n) => `- ${n}`).join("\n")}`,
  };
}
