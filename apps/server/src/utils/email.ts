import { sendEmail as libSendEmail } from "../lib/email/send-email";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

/**
 * Reusable wrapper that maps the legacy email helper function to the SMTP-based sendEmail.
 * Preserves the exact signature so existing workers/services do not require refactoring.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  await libSendEmail({
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: input.attachments,
  });
}
