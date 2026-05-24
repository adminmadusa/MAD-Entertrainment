"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = validateEnv;
exports.getEnv = getEnv;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(5001),
    MONGODB_URI: zod_1.z.string({ required_error: 'MONGODB_URI is required' }).url('MONGODB_URI must be a valid URL'),
    REDIS_URL: zod_1.z.string({ required_error: 'REDIS_URL is required' }).url('REDIS_URL must be a valid URL'),
    JWT_SECRET: zod_1.z.string({ required_error: 'JWT_SECRET is required' }).min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    JWT_ADMIN_SECRET: zod_1.z.string({ required_error: 'JWT_ADMIN_SECRET is required' }).min(32, 'JWT_ADMIN_SECRET must be at least 32 characters'),
    JWT_ADMIN_EXPIRES_IN: zod_1.z.string().default('1d'),
    ALLOWED_ORIGINS: zod_1.z.string().default('http://localhost:3000'),
    CLOUDINARY_CLOUD_NAME: zod_1.z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
    CLOUDINARY_API_KEY: zod_1.z.string().min(1, 'CLOUDINARY_API_KEY is required'),
    CLOUDINARY_API_SECRET: zod_1.z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
    ADMIN_SEED_EMAIL: zod_1.z.string().email('ADMIN_SEED_EMAIL must be a valid email').optional(),
    ADMIN_SEED_PASSWORD: zod_1.z.string().min(8, 'ADMIN_SEED_PASSWORD must be at least 8 characters').optional(),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().optional(),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    EMAIL_FROM: zod_1.z.string().optional(),
    RAZORPAY_KEY_ID: zod_1.z.string().min(1, 'RAZORPAY_KEY_ID is required'),
    RAZORPAY_KEY_SECRET: zod_1.z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
    RAZORPAY_WEBHOOK_SECRET: zod_1.z.string().min(1, 'RAZORPAY_WEBHOOK_SECRET is required'),
    STRIPE_SECRET_KEY: zod_1.z.string().optional(),
    STRIPE_PUBLISHABLE_KEY: zod_1.z.string().optional(),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string().optional(),
    LOG_LEVEL: zod_1.z.string().optional(),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().default(900000),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.coerce.number().default(100),
    RATE_LIMIT_AUTH_MAX: zod_1.z.coerce.number().default(10),
    RATE_LIMIT_PAYMENT_MAX: zod_1.z.coerce.number().default(20),
});
let env;
function validateEnv() {
    if (env)
        return env;
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Invalid environment variables configuration:');
        const formattedErrors = result.error.format();
        for (const [key, value] of Object.entries(formattedErrors)) {
            if (key !== '_errors') {
                const errorDetail = value._errors?.join(', ');
                console.error(`   - ${key}: ${errorDetail}`);
            }
        }
        throw new Error('Invalid environment variables configuration');
    }
    env = Object.freeze(result.data);
    console.log('✅ Environment variables validated successfully');
    return env;
}
function getEnv() {
    if (!env) {
        return validateEnv();
    }
    return env;
}
//# sourceMappingURL=env.js.map