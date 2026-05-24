"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = validateEnv;
exports.getEnv = getEnv;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(5001),
    MONGODB_URI: zod_1.z.string().url(),
    REDIS_URL: zod_1.z.string().url().optional(),
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    JWT_ADMIN_SECRET: zod_1.z.string().min(32),
    JWT_ADMIN_EXPIRES_IN: zod_1.z.string().default('1d'),
    ALLOWED_ORIGINS: zod_1.z.string().default('http://localhost:3000'),
    CLOUDINARY_CLOUD_NAME: zod_1.z.string().optional(),
    CLOUDINARY_API_KEY: zod_1.z.string().optional(),
    CLOUDINARY_API_SECRET: zod_1.z.string().optional(),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().optional(),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    EMAIL_FROM: zod_1.z.string().optional(),
    RAZORPAY_KEY_ID: zod_1.z.string().optional(),
    RAZORPAY_KEY_SECRET: zod_1.z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: zod_1.z.string().optional(),
    STRIPE_SECRET_KEY: zod_1.z.string().optional(),
    STRIPE_PUBLISHABLE_KEY: zod_1.z.string().optional(),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string().optional(),
    LOG_LEVEL: zod_1.z.string().optional(),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().default(900000),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.coerce.number().default(100),
    RATE_LIMIT_AUTH_MAX: zod_1.z.coerce.number().default(10),
    RATE_LIMIT_PAYMENT_MAX: zod_1.z.coerce.number().default(20),
    ENABLE_ASYNC_CHECKOUT: zod_1.z.preprocess((val) => val === 'true' || val === true, zod_1.z.boolean()).default(false),
});
let env;
function validateEnv() {
    if (env)
        return env;
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        const details = result.error.errors.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
        throw new Error(`Invalid environment variables: ${details}`);
    }
    env = Object.freeze(result.data);
    return env;
}
function getEnv() {
    return env ?? validateEnv();
}
//# sourceMappingURL=env.js.map