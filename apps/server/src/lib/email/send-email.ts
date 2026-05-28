import nodemailer from "nodemailer";
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

let _transporter: nodemailer.Transporter | undefined;

/**
 * Returns the Nodemailer SMTP transporter singleton.
 * Initialized lazily to prevent top-level module load crashes in test environments.
 */
export function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  const env = getEnv();
  _transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || "smtp.zeptomail.in",
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === "true",
    auth: {
      user: env.SMTP_USER || "emailapikey",
      pass: env.SMTP_PASS,
    },
  });

  return _transporter;
}

/**
 * Send a transactional email via Zoho ZeptoMail SMTP using Nodemailer.
 *
 * - Never throws. Returns a structured result so callers can handle
 *   failures without crashing the booking flow.
 * - Logs SMTP connection readiness and delivery results.
 */
export async function sendEmail(
  payload: EmailPayload,
): Promise<SendEmailResult> {
  const currentEnv = getEnv();
  const from =
    currentEnv.EMAIL_FROM ?? "MAD Entertainment <noreply@mad.esparex.in>";
  const replyTo = payload.replyTo ?? currentEnv.EMAIL_REPLY_TO;

  try {
    const transporter = getTransporter();

    // 1. Warmup / Verify SMTP connection before sending
    console.log("[SMTP VERIFYING] Checking connection...");
    await transporter.verify();
    console.log("[SMTP READY] Connection verified successfully");

    // 2. Dispatch email
    console.log("[EMAIL] Sending:", payload.to);

    const info = await transporter.sendMail({
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
              contentType: att.contentType,
            })),
          }
        : {}),
    });

    console.log("[EMAIL SUCCESS]", info.messageId);

    logger.info(
      { messageId: info.messageId, subject: payload.subject },
      "[email] Sent successfully via SMTP",
    );

    return { ok: true, messageId: info.messageId };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[EMAIL FAILED]", errorMsg);

    logger.error(
      { subject: payload.subject, err: errorMsg },
      "[email] SMTP delivery failed",
    );

    return { ok: false, error: errorMsg };
  }
}
