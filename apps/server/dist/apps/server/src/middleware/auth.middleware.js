"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = exports.requireAdmin = exports.optionalAuth = exports.requireAuth = void 0;
exports.ensureBookingOwner = ensureBookingOwner;
exports.requireRole = requireRole;
const shared_1 = require("@mad/shared");
function ensureBookingOwner(reqUserId, bookingUserId) {
    if (bookingUserId) {
        if (!reqUserId) {
            throw new Error('User not authenticated');
        }
        if (bookingUserId.toString() !== reqUserId) {
            throw new Error('User does not own the booking');
        }
    }
}
const jwt_1 = require("../utils/jwt");
const logger_1 = require("../utils/logger");
const response_1 = require("../utils/response");
// ─── Require Authenticated User ───────────────────────────────
const requireAuth = (req, res, next) => {
    const token = (0, jwt_1.extractBearerToken)(req.headers.authorization);
    if (!token) {
        (0, response_1.sendUnauthorized)(res, 'Authentication token required');
        return;
    }
    try {
        req.user = (0, jwt_1.verifyUserToken)(token);
        next();
    }
    catch (err) {
        logger_1.logger.debug({ err }, 'Invalid user token');
        (0, response_1.sendUnauthorized)(res, 'Invalid or expired token');
    }
};
exports.requireAuth = requireAuth;
// ─── Optional Auth (doesn't fail if no token) ────────────────
const optionalAuth = (req, _res, next) => {
    const token = (0, jwt_1.extractBearerToken)(req.headers.authorization);
    if (token) {
        try {
            req.user = (0, jwt_1.verifyUserToken)(token);
        }
        catch {
            // Ignore invalid tokens for optional auth
        }
    }
    next();
};
exports.optionalAuth = optionalAuth;
// ─── Require Admin ────────────────────────────────────────────
const requireAdmin = (req, res, next) => {
    const token = (0, jwt_1.extractBearerToken)(req.headers.authorization);
    if (!token) {
        (0, response_1.sendUnauthorized)(res, 'Admin authentication required');
        return;
    }
    try {
        req.admin = (0, jwt_1.verifyAdminToken)(token);
        next();
    }
    catch (err) {
        logger_1.logger.debug({ err }, 'Invalid admin token');
        (0, response_1.sendUnauthorized)(res, 'Invalid or expired admin token');
    }
};
exports.requireAdmin = requireAdmin;
// ─── Require Specific Admin Roles ────────────────────────────
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.admin) {
            (0, response_1.sendUnauthorized)(res, 'Admin authentication required');
            return;
        }
        if (!roles.includes(req.admin.role)) {
            (0, response_1.sendForbidden)(res, `Access denied. Required role: ${roles.join(' or ')}`);
            return;
        }
        next();
    };
}
// ─── Require Super Admin ──────────────────────────────────────
const requireSuperAdmin = (req, res, next) => {
    if (!req.admin) {
        (0, response_1.sendUnauthorized)(res, 'Admin authentication required');
        return;
    }
    if (req.admin.role !== shared_1.AdminRole.SUPER_ADMIN) {
        (0, response_1.sendForbidden)(res, 'Super admin access required');
        return;
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
//# sourceMappingURL=auth.middleware.js.map