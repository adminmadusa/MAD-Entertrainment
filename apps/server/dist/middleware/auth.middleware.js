"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
exports.requireAdmin = requireAdmin;
exports.requireRole = requireRole;
exports.requireSuperAdmin = requireSuperAdmin;
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
const shared_1 = require("@mad/shared");
const logger_1 = require("../utils/logger");
// ─── Require Authenticated User ───────────────────────────────
function requireAuth(req, res, next) {
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
}
// ─── Optional Auth (doesn't fail if no token) ────────────────
function optionalAuth(req, _res, next) {
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
}
// ─── Require Admin ────────────────────────────────────────────
function requireAdmin(req, res, next) {
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
}
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
function requireSuperAdmin(req, res, next) {
    if (!req.admin) {
        (0, response_1.sendUnauthorized)(res, 'Admin authentication required');
        return;
    }
    if (req.admin.role !== shared_1.AdminRole.SUPER_ADMIN) {
        (0, response_1.sendForbidden)(res, 'Super admin access required');
        return;
    }
    next();
}
//# sourceMappingURL=auth.middleware.js.map