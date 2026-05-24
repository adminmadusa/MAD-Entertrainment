"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminLogin = adminLogin;
exports.adminMe = adminMe;
exports.adminLogout = adminLogout;
const shared_1 = require("@mad/shared");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const error_middleware_1 = require("../../middleware/error.middleware");
const admin_schema_1 = require("../../models/admin.schema");
const jwt_1 = require("../../utils/jwt");
const logger_1 = require("../../utils/logger");
const response_1 = require("../../utils/response");
// ─── POST /api/admin/auth/login ───────────────────────────────
async function adminLogin(req, res) {
    const { email, password } = req.body;
    // 1. Find admin by email
    const admin = await admin_schema_1.Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
        // Use a generic message to prevent email enumeration
        (0, response_1.sendError)(res, 'Invalid email or password', shared_1.HTTP_STATUS.UNAUTHORIZED);
        return;
    }
    // 2. Check account is active
    if (!admin.isActive) {
        (0, response_1.sendError)(res, 'Your admin account has been disabled. Contact support.', shared_1.HTTP_STATUS.FORBIDDEN);
        return;
    }
    // 3. Verify password
    const isPasswordValid = await bcryptjs_1.default.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
        logger_1.logger.warn({ adminId: admin._id, email }, 'Failed admin login attempt');
        (0, response_1.sendError)(res, 'Invalid email or password', shared_1.HTTP_STATUS.UNAUTHORIZED);
        return;
    }
    // 4. Sign JWT
    const token = (0, jwt_1.signAdminToken)({
        adminId: admin._id.toString(),
        email: admin.email,
        role: admin.role,
    });
    // 5. Update last login timestamp
    await admin_schema_1.Admin.updateOne({ _id: admin._id }, { lastLogin: new Date() });
    logger_1.logger.info({ adminId: admin._id, role: admin.role }, 'Admin logged in');
    (0, response_1.sendSuccess)(res, {
        token,
        admin: {
            id: admin._id.toString(),
            name: admin.name,
            email: admin.email,
            role: admin.role,
        },
    }, 'Login successful');
}
// ─── GET /api/admin/auth/me ───────────────────────────────────
async function adminMe(req, res) {
    if (!req.admin) {
        throw error_middleware_1.AppError.unauthorized();
    }
    const admin = await admin_schema_1.Admin.findById(req.admin.adminId).select('-passwordHash');
    if (!admin || !admin.isActive) {
        (0, response_1.sendError)(res, 'Admin account not found or disabled', shared_1.HTTP_STATUS.UNAUTHORIZED);
        return;
    }
    (0, response_1.sendSuccess)(res, admin, 'Admin profile fetched');
}
// ─── POST /api/admin/auth/logout ─────────────────────────────
// JWT is stateless — logout is handled client-side by deleting the token.
// This endpoint exists for audit logging and future token blacklisting.
async function adminLogout(req, res) {
    if (req.admin) {
        logger_1.logger.info({ adminId: req.admin.adminId }, 'Admin logged out');
    }
    (0, response_1.sendSuccess)(res, null, 'Logged out successfully');
}
//# sourceMappingURL=auth.controller.js.map