import type { EmailContent } from "./email";

// Plain-template transactional emails. Each returns both an HTML and a text
// part — SendEmailCommand requires both, and mail providers weight
// HTML-only messages as more spam-like.

// Escapes untrusted values (e.g. a user-submitted email address) before they're
// interpolated into an HTML email body — unlike `link`/`eventNames` elsewhere in
// this file, which are server-generated and never carry attacker-controlled markup.
const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const wrap = (title: string, body: string): string => `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 16px">${title}</h2>
  ${body}
  <p style="margin-top:32px;color:#888;font-size:12px">Collegiates</p>
</div>`;

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
