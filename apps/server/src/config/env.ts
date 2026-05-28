import { z } from "zod";
import { assertRequiredEnv, parseAllowedOrigins } from "./env/validate-env";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().default(3001),

  MONGODB_URI: z.string().url(),

  REDIS_URL: z.string().url().optional(),

  // ─────────────────────────────────────────
  // User JWT
  // ─────────────────────────────────────────

  JWT_SECRET: z.string().min(32),

  JWT_EXPIRES_IN: z.string().default("7d"),

  // ─────────────────────────────────────────
  // Admin JWT
  // ─────────────────────────────────────────

  JWT_ADMIN_SECRET: z.string().min(32),

  JWT_ADMIN_EXPIRES_IN: z.string().default("1d"),

  // ─────────────────────────────────────────
  // Session JWT
  // IMPORTANT:
  // Separate from user/admin JWT secrets
  // ─────────────────────────────────────────

  JWT_SESSION_SECRET: z.string().min(32),

  // ─────────────────────────────────────────
  // Frontend / CORS
  // ─────────────────────────────────────────

  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

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

  SMTP_USER: z.string().optional(),

  SMTP_PASS: z.string().optional(),

  EMAIL_FROM: z.string().optional(),

  EMAIL_REPLY_TO: z.string().optional(),

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

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),

  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(10),

  RATE_LIMIT_PAYMENT_MAX: z.coerce.number().default(20),

  // ─────────────────────────────────────────
  // Async Checkout
  // ─────────────────────────────────────────

  ENABLE_ASYNC_CHECKOUT: z
    .preprocess((val) => val === "true" || val === true, z.boolean())
    .default(false),

  MOCK_PAYMENTS: z
    .preprocess((val) => val === "true" || val === true, z.boolean())
    .default(false),

  // ─────────────────────────────────────────
  // Outbox Worker Tuning
  // ─────────────────────────────────────────
  OUTBOX_WORKER_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(20),
  OUTBOX_WORKER_POLL_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(60000)
    .default(2000),
  OUTBOX_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(64).default(4),
  OUTBOX_WORKER_HEARTBEAT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(60000)
    .default(5000),
  OUTBOX_STALE_LOCK_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(3600000)
    .default(60000),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(50).default(8),
});

export type Env = z.infer<typeof envSchema>;

let env: Readonly<Env> | undefined;

// ─────────────────────────────────────────────
// Validate Environment
// ─────────────────────────────────────────────

export function validateEnv(): Readonly<Env> {
  if (env) return env;

  assertRequiredEnv(process.env);

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.errors
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment variables: ${details}`);
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

export function getAllowedOrigins(): string[] {
  return parseAllowedOrigins(getEnv().ALLOWED_ORIGINS);
}
