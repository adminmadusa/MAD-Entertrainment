"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadLimiter = exports.adminLimiter = exports.paymentLimiter = exports.otpLimiter = exports.authLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const redis_1 = require("../config/redis");
const shared_1 = require("@mad/shared");
const env_1 = require("../config/env");
const env = (0, env_1.getEnv)();
const isDev = env.NODE_ENV !== 'production';
const isTest = env.NODE_ENV === 'test';
const redis = (0, redis_1.getRedis)();
function makeRateLimiter(options) {
    return (0, express_rate_limit_1.default)({
        windowMs: options.windowMs,
        max: isDev ? 10000 : options.max, // Relaxed in dev
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        store: isTest
            ? undefined // Fallback to memory in test mode
            : new rate_limit_redis_1.default({
                // @ts-expect-error - ioredis has a slightly different call signature but works perfectly at runtime
                sendCommand: (...args) => redis.call(args[0], ...args.slice(1)),
                prefix: options.prefix,
            }),
        message: {
            success: false,
            message: options.message,
        },
        statusCode: shared_1.HTTP_STATUS.TOO_MANY_REQUESTS,
        skip: (req) => req.ip === '127.0.0.1' && isDev,
    });
}
// ─── General API Rate Limiter ─────────────────────────────────
exports.generalLimiter = makeRateLimiter({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP. Please try again in 15 minutes.',
    prefix: 'rl:gen:',
});
// ─── Auth Rate Limiter ────────────────────────────────────────
exports.authLimiter = makeRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 min
    max: env.RATE_LIMIT_AUTH_MAX,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    prefix: 'rl:auth:',
});
// ─── OTP Rate Limiter ─────────────────────────────────────────
exports.otpLimiter = makeRateLimiter({
    windowMs: 60 * 1000, // 1 min
    max: 3,
    message: 'Too many OTP requests. Please wait 1 minute.',
    prefix: 'rl:otp:',
});
// ─── Payment Rate Limiter ─────────────────────────────────────
exports.paymentLimiter = makeRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: env.RATE_LIMIT_PAYMENT_MAX,
    message: 'Too many payment requests. Please slow down.',
    prefix: 'rl:pay:',
});
// ─── Admin Rate Limiter ───────────────────────────────────────
exports.adminLimiter = makeRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Admin rate limit exceeded.',
    prefix: 'rl:adm:',
});
// ─── Media Upload Limiter ─────────────────────────────────────
exports.uploadLimiter = makeRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    message: 'Upload limit reached. Please try again in an hour.',
    prefix: 'rl:upld:',
});
//# sourceMappingURL=rateLimiter.middleware.js.map