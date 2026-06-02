import nodemailer from 'nodemailer';

import { getEnv } from '../config/env';
import { logger } from './logger';

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

let transporter: nodemailer.Transporter | null = null;

export function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const env = getEnv();
  logger.info({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    from: env.MAIL_FROM,
    secure: env.SMTP_SECURE,
  }, "SMTP runtime configuration");

  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    logger.warn('SMTP_HOST or SMTP_PORT is missing. SMTP transporter will not be initialized.');
    return null;
  }

  logger.info("SMTP transporter initializing");

  // Safe startup logging (strictly no passwords/secrets exposed)
  logger.info({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
    from: env.MAIL_FROM,
    replyTo: env.EMAIL_REPLY_TO,
  }, "SMTP configuration loaded");

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 10, // Satisfies typical high-throughput and rate-limit safety rules
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  return transporter;
}

export async function verifyTransporter(): Promise<boolean> {
  const tx = getTransporter();
  if (!tx) {
    logger.warn('SMTP transporter not configured; skipping verification');
    return false;
  }

  try {
    logger.info("SMTP verify starting");
    logger.info("Verifying SMTP transporter connection pool...");
    await tx.verify();
    logger.info("SMTP verify success");
    logger.info("SMTP transporter ready and verified successfully");
    return true;
  } catch (error) {
    logger.error(error, "SMTP verify failed");
    logger.error(error, "SMTP transporter failed verification");
    return false;
  }
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const env = getEnv();
  const tx = getTransporter();
  if (!tx) {
    logger.warn({ to: input.to, subject: input.subject }, 'SMTP not configured; email skipped');
    return;
  }

  const { to, subject } = input;
  logger.info({ to, subject }, "Sending email");
  logger.info({ to: input.to, subject: input.subject }, "Sending transactional email");

  try {
    const info = await tx.sendMail({
      from: env.MAIL_FROM ?? env.SMTP_USER,
      replyTo: env.EMAIL_REPLY_TO,
      to: input.to,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments,
      messageId: input.messageId,
    });
    logger.info({ messageId: info.messageId }, "Email sent");
    logger.info({ messageId: info.messageId, to: input.to }, "Transactional email delivered successfully");
  } catch (error) {
    logger.error(error, "Email send failed");
    logger.error({
      error,
      to: input.to,
      subject: input.subject,
    }, "Transactional email failed to send");
    throw error; // Bubble up error so BullMQ workers can retry correctly
  }
}
