import { getResendClient } from "./resend";
import { getEnv } from "../../config/env";
import { logger } from "../../utils/logger";

export interface EmailPayload {
  /** Recipient address */
  to: string;
  subject: string;
  html: string;
  /** Optional reply-to override; falls back to EMAIL_REPLY_TO env var */
  replyTo?: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
}

export type SendEmailResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

/**
 * Send a transactional email via Resend.
 *
 * - Never throws. Returns a structured result so callers can handle
 *   failures without crashing the booking flow.
 * - Logs success/failure without exposing PII beyond the recipient domain.
 */
export async function sendEmail(
  payload: EmailPayload,
): Promise<SendEmailResult> {
  const env = getEnv();
  const from = env.EMAIL_FROM ?? "MAD Entertainment <onboarding@resend.dev>";
  const replyTo = payload.replyTo ?? env.EMAIL_REPLY_TO;

  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      ...(replyTo ? { replyTo } : {}),
      ...(payload.attachments?.length
        ? {
            attachments: payload.attachments.map((att) => ({
              filename: att.filename,
              content: att.content,
            })),
          }
        : {}),
    });

    console.log("RESEND RESPONSE:", { data, error });

    if (error) {
      logger.error(
        { subject: payload.subject, err: error.message },
        "[email] Resend rejected the message",
      );
      return { ok: false, error: error.message };
    }

    logger.info(
      { messageId: data?.id, subject: payload.subject },
      "[email] Sent successfully via Resend",
    );

    return { ok: true, messageId: data?.id ?? "" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      { subject: payload.subject, err: message },
      "[email] Resend delivery failed",
    );
    return { ok: false, error: message };
  }
}
