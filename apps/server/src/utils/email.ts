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
    logger.warn({ to: input.to, subject: input.subject }, 'SMTP not configured; email skipped');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 10, // Satisfies typical high-throughput and rate-limit safety rules
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  await transporter.sendMail({
    from: env.EMAIL_FROM ?? env.SMTP_USER,
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: input.attachments,
  });
}
