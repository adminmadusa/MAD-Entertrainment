"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadLimiter = exports.adminLimiter = exports.paymentLimiter = exports.otpLimiter = exports.authLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const shared_1 = require("@mad/shared");
const isDev = process.env.NODE_ENV !== 'production';
function makeRateLimiter(options) {
    return (0, express_rate_limit_1.default)({
        windowMs: options.windowMs,
        max: isDev ? 10000 : options.max, // Relaxed in dev
        standardHeaders: 'draft-7',
        legacyHeaders: false,
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
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10), // 15 min
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),
    message: 'Too many requests from this IP. Please try again in 15 minutes.',
});
// ─── Auth Rate Limiter ────────────────────────────────────────
exports.authLimiter = makeRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 min
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX ?? '10', 10),
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
});
// ─── OTP Rate Limiter ─────────────────────────────────────────
exports.otpLimiter = makeRateLimiter({
    windowMs: 60 * 1000, // 1 min
    max: 3,
    message: 'Too many OTP requests. Please wait 1 minute.',
});
// ─── Payment Rate Limiter ─────────────────────────────────────
exports.paymentLimiter = makeRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_PAYMENT_MAX ?? '20', 10),
    message: 'Too many payment requests. Please slow down.',
});
// ─── Admin Rate Limiter ───────────────────────────────────────
exports.adminLimiter = makeRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Admin rate limit exceeded.',
});
// ─── Media Upload Limiter ─────────────────────────────────────
exports.uploadLimiter = makeRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    message: 'Upload limit reached. Please try again in an hour.',
});
//# sourceMappingURL=rateLimiter.middleware.js.map