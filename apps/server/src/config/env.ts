import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5001),
  MONGODB_URI: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_ADMIN_SECRET: z.string().min(32),
  JWT_ADMIN_EXPIRES_IN: z.string().default('1d'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(10),
  RATE_LIMIT_PAYMENT_MAX: z.coerce.number().default(20),
  ENABLE_ASYNC_CHECKOUT: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
});

export type Env = z.infer<typeof envSchema>;

let env: Readonly<Env> | undefined;

export function validateEnv(): Readonly<Env> {
  if (env) return env;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.errors.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid environment variables: ${details}`);
  }

  env = Object.freeze(result.data);
  return env;
}

export function getEnv(): Readonly<Env> {
  return env ?? validateEnv();
}
