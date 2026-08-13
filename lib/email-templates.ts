import type { EmailContent } from "./email";

/**
 * Bodies for every transactional email the site sends.
 *
 * @remarks
 * Each builder returns both an HTML and a plain-text part: SES's
 * `SendEmailCommand` takes both, and mail providers weight HTML-only messages
 * as more spam-like.
 *
 * Interpolated values are either server-generated (a signed link, a formatted
 * amount) or stored text that a human typed at some point — event names, a
 * school name, an email address. Everything in the second group goes through
 * `escapeHtml`.
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

/** One registered event, as the two registration emails list it. */
export interface RegistrationLine {
  /** The event's display name, falling back to its code. */
  name: string;
  /** The declared difficulty string. Present only for nandu events. */
  nandu?: string | null;
}

/**
 * The billing block both registration emails close with.
 *
 * @remarks
 * `total` is the same `computeTotalOwed` figure the competitor's dashboard and
 * the organizer's payments screen show, so a receipt never states an amount the
 * competitor is then billed differently for. It is null when the competition has
 * no fee schedule configured, and the whole money block is dropped.
 */
export interface RegistrationBilling {
  /** Whole dollars owed for the year, or null when no fee schedule is set. */
  total: number | null;
  /** Whole dollars recorded as received so far. */
  paid: number;
  /** The payment and proof-of-enrollment deadline, already formatted. */
  dueDate: string;
  /** The organizer address to reply to, when the settings carry one. */
  contactEmail?: string | null;
}

// Whole dollars throughout — every cost column on Settings and amt_paid are ints.
const money = (amount: number): string => `$${amount}`;

// One label/value line. Right-aligning the value is what makes the totals read
// as a column in clients that honour inline styles.
const row = (label: string, value: string, bold = false): string => `
  <tr>
    <td style="padding:4px 0;${bold ? "font-weight:600;" : ""}">${label}</td>
    <td style="padding:4px 0;text-align:right;white-space:nowrap;${bold ? "font-weight:600;" : ""}">${value}</td>
  </tr>`;

// The registered events, one per line, with any nandu code under the name.
function eventsHtml(events: RegistrationLine[]): string {
  const rows = events
    .map((e) =>
      row(
        escapeHtml(e.name) +
          (e.nandu ? `<br><span style="color:#888;font-size:12px">Nandu code: ${escapeHtml(e.nandu)}</span>` : ""),
        "",
      ),
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>`;
}

function eventsText(events: RegistrationLine[]): string {
  return events.map((e) => `- ${e.name}${e.nandu ? ` (nandu code: ${e.nandu})` : ""}`).join("\n");
}

// A balance is only meaningful once a total exists, so with no fee schedule
// configured this degrades to the deadline alone rather than claiming $0 is owed.
function billingHtml(billing: RegistrationBilling): string {
  const rows: string[] = [];
  if (billing.total != null) {
    rows.push(row("Total cost", money(billing.total)));
    rows.push(row("Paid", money(billing.paid)));
    rows.push(row("Balance due", money(Math.max(0, billing.total - billing.paid)), true));
  }
  const table = rows.length
    ? `<table style="width:100%;border-collapse:collapse;font-size:14px;border-top:1px solid #ddd;margin-top:8px;padding-top:8px">${rows.join("")}</table>`
    : "";
  const due = `<p style="font-size:14px">Payment and proof of enrollment are due by <strong>${escapeHtml(billing.dueDate)}</strong>.</p>`;
  const contact = billing.contactEmail
    ? `<p style="font-size:14px">Questions? Reply to <a href="mailto:${escapeHtml(billing.contactEmail)}" style="color:#2563eb">${escapeHtml(billing.contactEmail)}</a>.</p>`
    : "";
  return table + due + contact;
}

function billingText(billing: RegistrationBilling): string {
  const lines: string[] = [];
  if (billing.total != null) {
    lines.push(`Total cost: ${money(billing.total)}`);
    lines.push(`Paid: ${money(billing.paid)}`);
    lines.push(`Balance due: ${money(Math.max(0, billing.total - billing.paid))}`);
    lines.push("");
  }
  lines.push(`Payment and proof of enrollment are due by ${billing.dueDate}.`);
  if (billing.contactEmail) lines.push(`Questions? Reply to ${billing.contactEmail}.`);
  return lines.join("\n");
}

/**
 * The receipt sent once event registrations are written.
 *
 * @remarks
 * Sent best-effort by `createRegistrations`, after the rows are committed. It
 * restates what the confirm screen showed — the events, the cost, the deadline —
 * so the competitor keeps a copy of what they agreed to.
 *
 * @param events - The events registered for, in the order they were submitted.
 * @param billing - What is owed and by when. Omitted only when the settings row
 * needed to price the registration could not be read.
 */
export function registrationConfirmedEmail(
  events: RegistrationLine[],
  billing?: RegistrationBilling,
): EmailContent {
  return {
    subject: "Your Collegiates registration receipt",
    html: wrap(
      "Registration confirmed",
      `<p>You're registered for the following events:</p>
       ${eventsHtml(events)}
       ${billing ? billingHtml(billing) : ""}`,
    ),
    text: `You're registered for the following events:\n${eventsText(events)}${billing ? `\n\n${billingText(billing)}` : ""}`,
  };
}

/**
 * Sent to a competitor when an organizer edits their registration on their
 * behalf.
 *
 * @remarks
 * The competitor cannot see the organizer console, so an edit made there is
 * otherwise silent — this is the only notice they get that their entry, payment,
 * or profile was changed by somebody else.
 *
 * @param changes - One human-readable line per field that actually changed.
 * `updateOrganizerRegistration` skips the send when this is empty, so a save
 * that altered nothing does not mail anybody.
 * @param events - The competitor's events *after* the edit, so the message
 * doubles as a current statement of what they are entered in.
 * @param billing - What is owed and by when, after the edit.
 */
export function registrationUpdatedEmail(
  changes: string[],
  events: RegistrationLine[],
  billing?: RegistrationBilling,
): EmailContent {
  const changeItems = changes.map((c) => `<li style="margin-bottom:4px">${escapeHtml(c)}</li>`).join("");
  return {
    subject: "Your Collegiates registration was updated",
    html: wrap(
      "Registration updated",
      `<p>An organizer updated your registration:</p>
       <ul style="font-size:14px;padding-left:20px">${changeItems}</ul>
       <p style="margin-top:24px">You are now registered for:</p>
       ${events.length ? eventsHtml(events) : `<p style="font-size:14px;color:#888">No events.</p>`}
       ${billing ? billingHtml(billing) : ""}
       <p style="font-size:14px">If anything here looks wrong, contact the organizers.</p>`,
    ),
    text:
      `An organizer updated your registration:\n${changes.map((c) => `- ${c}`).join("\n")}\n\n` +
      `You are now registered for:\n${events.length ? eventsText(events) : "- No events."}` +
      `${billing ? `\n\n${billingText(billing)}` : ""}\n\nIf anything here looks wrong, contact the organizers.`,
  };
}
