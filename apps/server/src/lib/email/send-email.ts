import { getEnv } from "../../config/env";
import { getEmailTransporter, isEmailConfigured } from "../../config/email";
import { logger } from "../../utils/logger";

export interface EmailPayload {
  /** Recipient address */
  to: string;
  subject: string;
  html: string;
  /** Optional reply-to override; falls back to EMAIL_REPLY_TO env var */
  replyTo?: string;
}

export type SendEmailResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

/**
 * Send a transactional email.
 *
 * - Never throws. Returns a structured result so callers can handle
 *   failures without crashing the booking flow.
 * - Safely no-ops (returns ok: false) when SMTP is not configured.
 * - Logs success/failure without exposing PII beyond the recipient domain.
 */
export async function sendEmail(
  payload: EmailPayload,
): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    logger.warn(
      { subject: payload.subject },
      "[email] SMTP not configured — email skipped",
    );
    return { ok: false, error: "SMTP not configured" };
  }

  const env = getEnv();
  const from =
    env.EMAIL_FROM ?? env.SMTP_USER ?? "noreply@madentertrainment.com";
  const replyTo = payload.replyTo ?? env.EMAIL_REPLY_TO ?? from;

  try {
    const info = await getEmailTransporter().sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      replyTo,
    });

    logger.info(
      { messageId: info.messageId, subject: payload.subject },
      "[email] Sent successfully",
    );

    return { ok: true, messageId: info.messageId as string };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      { subject: payload.subject, err: message },
      "[email] Delivery failed",
    );
    return { ok: false, error: message };
  }
}
