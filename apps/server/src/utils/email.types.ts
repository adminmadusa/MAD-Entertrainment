/**
 * Shared email types.
 *
 * Extracted from email.ts to break the circular dependency between
 * utils/email.ts and utils/zeptomail.ts.
 *
 * Import types from here; do not import from email.ts if you only need types.
 */

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
  messageId?: string;
}
