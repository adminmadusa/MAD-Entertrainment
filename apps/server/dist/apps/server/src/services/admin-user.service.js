"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminUserService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Admin_model_1 = require("../models/Admin.model");
const error_middleware_1 = require("../middleware/error.middleware");
const shared_1 = require("@mad/shared");
class AdminUserService {
    static async listAdmins(page, limit) {
        const skip = (page - 1) * limit;
        const [admins, total] = await Promise.all([
            Admin_model_1.Admin.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('-passwordHash')
                .lean(),
            Admin_model_1.Admin.countDocuments(),
        ]);
        return { admins, total };
    }
    static async createAdminUser(data) {
        const { name, email, password, role } = data;
        if (!password) {
            throw error_middleware_1.AppError.badRequest('Password is required');
        }
        const existing = await Admin_model_1.Admin.findOne({ email: email.toLowerCase() });
        if (existing) {
            throw error_middleware_1.AppError.conflict('An admin with this email already exists');
        }
        const assignedRole = role || shared_1.AdminRole.ADMIN;
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const admin = await Admin_model_1.Admin.create({
            name,
            email: email.toLowerCase(),
            passwordHash,
            role: assignedRole,
            isActive: true,
        });
        const result = admin.toObject();
        delete result.passwordHash;
        return result;
    }
    static async toggleAdminActive(id, currentAdminId) {
        if (id === currentAdminId) {
            throw error_middleware_1.AppError.badRequest('You cannot deactivate your own account');
        }
        const admin = await Admin_model_1.Admin.findById(id);
        if (!admin) {
            throw error_middleware_1.AppError.notFound('Admin');
        }
        admin.isActive = !admin.isActive;
        await admin.save();
        return admin.isActive;
    }
}
exports.AdminUserService = AdminUserService;
//# sourceMappingURL=admin-user.service.js.map