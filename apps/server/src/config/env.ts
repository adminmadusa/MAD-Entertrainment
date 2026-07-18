import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  APP_ENV: z
    .enum(['local', 'development', 'staging', 'production'])
    .default('local'),

  PORT: z.coerce.number().default(3001),

  MONGODB_URI: z.string().url(),

  MONGODB_HEARTBEAT_MS: z.coerce.number().default(5000),

  REDIS_URL: z.string().url().optional(),

  // ─────────────────────────────────────────
  // User JWT
  // ─────────────────────────────────────────

  JWT_SECRET: z.string().min(32),

  JWT_EXPIRES_IN: z.string().default('7d'),

  // ─────────────────────────────────────────
  // Admin JWT
  // ─────────────────────────────────────────

  JWT_ADMIN_SECRET: z.string().min(32),

  JWT_ADMIN_EXPIRES_IN: z.string().default('1d'),

  // ─────────────────────────────────────────
  // Session JWT
  // IMPORTANT:
  // Separate from user/admin JWT secrets
  // ─────────────────────────────────────────

  JWT_SESSION_SECRET: z.string().min(32),

  // ─────────────────────────────────────────
  // Frontend / CORS
  // ─────────────────────────────────────────

  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000'),

  FRONTEND_URL: z.string().url().optional(),

  // ─────────────────────────────────────────
  // Cloudinary
  // ─────────────────────────────────────────

  CLOUDINARY_CLOUD_NAME: z.string().optional(),

  CLOUDINARY_API_KEY: z.string().optional(),

  CLOUDINARY_API_SECRET: z.string().optional(),

  // ─────────────────────────────────────────
  // Email / SMTP
  // ─────────────────────────────────────────

  SMTP_HOST: z.string().optional(),

  SMTP_PORT: z.coerce.number().optional(),

  SMTP_SECURE: z
    .preprocess(
      (val) => val === 'true' || val === true,
      z.boolean()
    )
    .optional(),

  SMTP_USER: z.string().optional(),

  SMTP_PASS: z.string().optional(),

  MAIL_FROM: z.string().optional(),

  EMAIL_REPLY_TO: z.string().optional(),

  EMAIL_PROVIDER: z
    .enum(['smtp', 'zeptomail'])
    .default('smtp'),

  ZEPTOMAIL_API_TOKEN: z.string().optional(),

  ZEPTOMAIL_API_URL: z
    .string()
    .default('https://api.zeptomail.in/v1.1/email'),

  // ─────────────────────────────────────────
  // Razorpay
  // ─────────────────────────────────────────

  RAZORPAY_KEY_ID: z.string().optional(),

  RAZORPAY_KEY_SECRET: z.string().optional(),

  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // ─────────────────────────────────────────
  // Stripe
  // ─────────────────────────────────────────

  STRIPE_SECRET_KEY: z.string().optional(),

  STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // ─────────────────────────────────────────
  // Logging
  // ─────────────────────────────────────────

  LOG_LEVEL: z.string().optional(),

  // ─────────────────────────────────────────
  // Rate Limiting
  // ─────────────────────────────────────────

  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .default(900000),

  RATE_LIMIT_MAX_REQUESTS: z.coerce
    .number()
    .default(100),

  RATE_LIMIT_AUTH_MAX: z.coerce
    .number()
    .default(10),

  RATE_LIMIT_PAYMENT_MAX: z.coerce
    .number()
    .default(20),

  // ─────────────────────────────────────────
  // Async Checkout
  // ─────────────────────────────────────────

  ENABLE_ASYNC_CHECKOUT: z
    .preprocess(
      (val) => val === 'true' || val === true,
      z.boolean()
    )
    .default(false),

  MOCK_PAYMENTS: z
    .preprocess(
      (val) => val === 'true' || val === true,
      z.boolean()
    )
    .default(false),

  ENABLE_MODULAR_PDF: z
    .preprocess(
      (val) => val === 'true' || val === true,
      z.boolean()
    )
    .default(false),

  // ─────────────────────────────────────────
  // Google OAuth
  // ─────────────────────────────────────────

  GOOGLE_CLIENT_ID: z.string().optional(),

  COOKIE_DOMAIN: z.string().optional(),

  MARKETING_UNSUBSCRIBE_SECRET: z.string().optional(),

  DLQ_ENCRYPTION_KEY: z
    .string()
    .min(32)
    .default('a_secret_key_of_32_characters_long_for_dev'),

  BOOKING_OWNERSHIP_GRACE_MS: z.coerce
    .number()
    .default(600000), // Default to 10 minutes (600,000 ms)
});

export type Env = z.infer<typeof envSchema>;

let env: Readonly<Env> | undefined;

// ─────────────────────────────────────────────
// Validate Environment
// ─────────────────────────────────────────────

export function validateEnv(): Readonly<Env> {
  if (env) return env;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.errors
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment variables: ${details}`);
  }

  // Dual Protection: Startup Protection
  const isProd = result.data.NODE_ENV === 'production' || result.data.APP_ENV === 'production';
  if (isProd) {
    if (!process.env.DLQ_ENCRYPTION_KEY) {
      throw new Error('DLQ_ENCRYPTION_KEY is mandatory in production environment.');
    }
    if (process.env.DLQ_ENCRYPTION_KEY === 'a_secret_key_of_32_characters_long_for_dev') {
      throw new Error('Cannot use the default development DLQ_ENCRYPTION_KEY in production.');
    }
  }

  // Webhook secret production assertions (F-16)
  // Each secret is only required when the corresponding gateway key is configured.
  // This preserves local dev flexibility while preventing silent webhook validation
  // failure in production caused by a missing secret.
  if (isProd) {
    if (result.data.RAZORPAY_KEY_ID && !result.data.RAZORPAY_WEBHOOK_SECRET) {
      throw new Error(
        'RAZORPAY_WEBHOOK_SECRET is required in production when RAZORPAY_KEY_ID is configured. ' +
        'Set this value in the Render environment variables dashboard. ' +
        'Without it, Razorpay webhook signature validation will fail and payments will not confirm via webhook.'
      );
    }
    if (result.data.STRIPE_SECRET_KEY && !result.data.STRIPE_WEBHOOK_SECRET) {
      throw new Error(
        'STRIPE_WEBHOOK_SECRET is required in production when STRIPE_SECRET_KEY is configured. ' +
        'Set this value in the Render environment variables dashboard. ' +
        'Without it, Stripe webhook signature validation will fail and payments will not confirm via webhook.'
      );
    }
  }

  if (isProd && result.data.MOCK_PAYMENTS) {
    const errorMsg = 'MOCK_PAYMENTS_PRODUCTION_BLOCKED: Mock payments cannot be enabled in production environments.';
    console.error(`❌ ${errorMsg}`);

    // Capture Sentry exception
    try {
      const Sentry = require('@sentry/node');
      Sentry.captureException(new Error(errorMsg), {
        tags: { type: 'MOCK_PAYMENTS_PRODUCTION_BLOCKED' },
      });
    } catch (_err) {
      // Ignore
    }

    // Create audit event
    try {
      const { auditLog } = require('../utils/audit');
      auditLog({
        action: 'MOCK_PAYMENTS_PRODUCTION_BLOCKED',
        status: 'failure',
        description: errorMsg,
      });
    } catch (_err) {
      // Ignore
    }

    throw new Error(errorMsg);
  }

  env = Object.freeze(result.data);
  return env;
}

// ─────────────────────────────────────────────
// Get Environment
// ─────────────────────────────────────────────

export function getEnv(): Readonly<Env> {
  return env ?? validateEnv();
}
