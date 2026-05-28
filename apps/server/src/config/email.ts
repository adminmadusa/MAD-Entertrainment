import nodemailer, { Transporter } from "nodemailer";

import { getEnv } from "./env";

let transporter: Transporter | undefined;

/**
 * Initialise the nodemailer transporter from environment variables.
 * Returns undefined when SMTP credentials are not configured so callers
 * can degrade gracefully rather than hard-crash.
 */
export function initEmailTransporter(): Transporter | undefined {
  const env = getEnv();

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return undefined;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: (env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  return transporter;
}

/**
 * Return the singleton transporter, initialising it on first call.
 * Throws if SMTP credentials are absent.
 */
export function getEmailTransporter(): Transporter {
  const instance = transporter ?? initEmailTransporter();
  if (!instance) {
    throw new Error(
      "Email transporter is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.",
    );
  }
  return instance;
}

/**
 * Returns true when all required SMTP environment variables are present.
 */
export function isEmailConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}
