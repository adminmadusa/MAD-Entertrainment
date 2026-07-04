import nodemailer from 'nodemailer';
import * as Sentry from '@sentry/node';

import { getEnv } from '../config/env';
import { logger } from './logger';
import { auditLog } from './audit';

import type { EmailAttachment, SendEmailInput } from './email.types';

export type { EmailAttachment, SendEmailInput } from './email.types';


let transporter: nodemailer.Transporter | null = null;

export function resetTransporter(): void {
  transporter = null;
}

export function validateSmtpConfig(): void {
  const env = getEnv();
  if (env.SMTP_HOST) {
    const missingFields: string[] = [];
    if (!env.SMTP_PORT) missingFields.push('SMTP_PORT');
    if (!env.SMTP_USER) missingFields.push('SMTP_USER');
    if (!env.SMTP_PASS) missingFields.push('SMTP_PASS');
    if (!env.MAIL_FROM) missingFields.push('MAIL_FROM');

    if (missingFields.length > 0) {
      const errorMsg = `SMTP_CONFIGURATION_INVALID: SMTP configuration is incomplete. Missing fields: ${missingFields.join(', ')}`;
      logger.error(errorMsg);

      // Sentry log
      try {
        Sentry.captureMessage(errorMsg, {
          level: 'fatal',
          tags: { type: 'SMTP_CONFIGURATION_INVALID' },
        });
      } catch (err) {
        logger.error(err, 'Failed to log SMTP config error to Sentry');
      }

      // Durable Audit Log
      auditLog({
        action: 'SMTP_CONFIGURATION_INVALID',
        status: 'failure',
        description: `SMTP configuration validation failed. Missing fields: ${missingFields.join(', ')}`,
        metadata: { missingFields },
      });

      throw new Error(errorMsg);
    }
  }
}

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

    // Durable Audit Log
    auditLog({
      action: 'SMTP_TRANSPORT_VERIFIED',
      status: 'success',
      description: 'SMTP transporter ready and verified successfully',
    });

    return true;
  } catch (error: any) {
    logger.error(error, "SMTP_TRANSPORT_UNAVAILABLE: SMTP verify failed");
    logger.error(error, "SMTP_TRANSPORT_UNAVAILABLE: SMTP transporter failed verification");

    // Sentry log
    try {
      Sentry.captureException(error, {
        tags: { type: 'SMTP_TRANSPORT_UNAVAILABLE' },
      });
    } catch (err) {
      logger.error(err, 'Failed to log SMTP verify failure to Sentry');
    }

    // Durable Audit Log
    auditLog({
      action: 'SMTP_TRANSPORT_UNAVAILABLE',
      status: 'failure',
      description: `SMTP transporter failed verification: ${error.message}`,
      metadata: { error: error.message },
    });

    return false;
  }
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const env = getEnv();

  if (env.EMAIL_PROVIDER === 'zeptomail') {
    const { sendViaZeptoMail } = await import('./zeptomail.js');
    return sendViaZeptoMail(input);
  }

  const tx = getTransporter();
  if (!tx) {
    const errorMsg = 'SMTP_TRANSPORT_UNAVAILABLE: SMTP transporter unavailable';
    logger.error({ to: input.to, subject: input.subject }, errorMsg);

    // Sentry log
    try {
      Sentry.captureMessage(errorMsg, {
        level: 'error',
        tags: { type: 'SMTP_TRANSPORT_UNAVAILABLE' },
        extra: { to: input.to, subject: input.subject },
      });
    } catch (err) {
      logger.error(err, 'Failed to log SMTP transport unavailable to Sentry');
    }

    // Durable Audit Log
    auditLog({
      action: 'SMTP_TRANSPORT_UNAVAILABLE',
      status: 'failure',
      description: `SMTP transporter unavailable when trying to send email to ${input.to}`,
      metadata: { to: input.to, subject: input.subject },
    });

    throw new Error('SMTP transporter unavailable');
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
  } catch (error: any) {
    logger.error(error, "Email send failed");
    logger.error({
      error,
      to: input.to,
      subject: input.subject,
    }, "Transactional email failed to send");

    // Durable Audit Log
    auditLog({
      action: 'SMTP_DELIVERY_FAILURE',
      status: 'failure',
      description: `SMTP delivery failed for recipient ${input.to}: ${error.message}`,
      metadata: { to: input.to, subject: input.subject, error: error.message },
    });

    throw error; // Bubble up error so BullMQ workers can retry correctly
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

