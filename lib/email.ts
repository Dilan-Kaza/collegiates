import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

/**
 * Thin AWS SES wrapper for transactional email.
 *
 * @remarks
 * Used for account activation, password reset, email-change confirmation, and
 * registration receipts. Message bodies live in {@link "lib/email-templates"};
 * this module is transport only.
 *
 * `SES_FROM_EMAIL` must name a verified SES identity. For local work verify a
 * single address — note that the SES sandbox also requires the *recipient* to
 * be verified, or you can use the mailbox simulator addresses. In production,
 * verify a domain instead so the sender address can vary.
 *
 * @packageDocumentation
 */
const ses = new SESv2Client({ region: process.env.AWS_REGION });

/** A rendered message: subject plus both MIME alternatives. */
export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/**
 * The verified identity every send goes out from.
 *
 * @remarks
 * Exported so a caller that writes to the database *before* it sends can check
 * the sender up front and abort while nothing is persisted yet — see
 * `registerUser`, where a user created without a deliverable activation email
 * would be permanently stranded.
 *
 * @throws When `SES_FROM_EMAIL` is unset.
 */
export function fromAddress(): string {
  const from = process.env.SES_FROM_EMAIL;
  if (!from) throw new Error("SES_FROM_EMAIL is not set.");
  return from;
}

/**
 * Sends one message through SES.
 *
 * @param to - The recipient address.
 * @param content - A rendered message from {@link "lib/email-templates"}.
 * @throws When the sender is unconfigured, or SES rejects the send. Callers
 * whose database write has already succeeded should catch and log rather than
 * fail the operation — see `createRegistrations`.
 */
export async function sendEmail(to: string, content: EmailContent): Promise<void> {
  const from = fromAddress();

  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: content.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: content.html, Charset: "UTF-8" },
            Text: { Data: content.text, Charset: "UTF-8" },
          },
        },
      },
    }),
  );
}
