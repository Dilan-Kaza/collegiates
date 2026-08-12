import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

// Thin SES wrapper for transactional email (activation, password reset,
// registration confirmation). SES_FROM_EMAIL must be a verified identity —
// for local/testing use a single verified email address (SES sandbox also
// requires the recipient to be verified, or use the mailbox simulator
// addresses); for production, verify a domain instead so the address can vary.
const ses = new SESv2Client({ region: process.env.AWS_REGION });

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

// The verified identity every send goes out from. Exported so a caller that
// writes before it sends can check the sender up front and abort while nothing
// is persisted yet — see registerUser.
export function fromAddress(): string {
  const from = process.env.SES_FROM_EMAIL;
  if (!from) throw new Error("SES_FROM_EMAIL is not set.");
  return from;
}

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
