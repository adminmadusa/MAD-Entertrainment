"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signUserToken = signUserToken;
exports.verifyUserToken = verifyUserToken;
exports.signAdminToken = signAdminToken;
exports.verifyAdminToken = verifyAdminToken;
exports.extractBearerToken = extractBearerToken;
exports.decodeToken = decodeToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("./logger");
// ─── User Tokens ─────────────────────────────────────────────
function signUserToken(payload) {
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d';
    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn });
}
function verifyUserToken(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }
    return jsonwebtoken_1.default.verify(token, secret);
}
// ─── Admin Tokens ─────────────────────────────────────────────
function signAdminToken(payload) {
    const secret = process.env.JWT_ADMIN_SECRET;
    const expiresIn = process.env.JWT_ADMIN_EXPIRES_IN ?? '1d';
    if (!secret) {
        throw new Error('JWT_ADMIN_SECRET is not configured');
    }
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn });
}
function verifyAdminToken(token) {
    const secret = process.env.JWT_ADMIN_SECRET;
    if (!secret) {
        throw new Error('JWT_ADMIN_SECRET is not configured');
    }
    return jsonwebtoken_1.default.verify(token, secret);
}
// ─── Extract Token from Header ────────────────────────────────
function extractBearerToken(authHeader) {
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.slice(7);
}
// ─── Decode Without Verify (for logging only) ─────────────────
function decodeToken(token) {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch {
        logger_1.logger.warn('Failed to decode JWT token');
        return null;
    }
}
//# sourceMappingURL=jwt.js.map