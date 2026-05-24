"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAdmins = listAdmins;
exports.createAdminUser = createAdminUser;
exports.toggleAdminActive = toggleAdminActive;
const admin_user_service_1 = require("../../services/admin/admin-user.service");
const response_1 = require("../../utils/response");
async function listAdmins(req, res) {
    const { page, limit } = (0, response_1.parsePaginationParams)(req.query);
    const { admins, total } = await admin_user_service_1.AdminUserService.listAdmins(page, limit);
    (0, response_1.sendPaginated)(res, admins, (0, response_1.buildPaginationMeta)(total, page, limit));
}
async function createAdminUser(req, res) {
    const body = req.body;
    const admin = await admin_user_service_1.AdminUserService.createAdminUser(body);
    loggerInfo(req, admin.id);
    (0, response_1.sendCreated)(res, admin, 'Admin created successfully');
}
function loggerInfo(req, newAdminId) {
    // Safe extraction helper to log context
    const creator = req.admin?.adminId;
    const { logger } = require('../../utils/logger');
    logger.info({ newAdminId, createdBy: creator }, 'Super admin created new admin');
}
async function toggleAdminActive(req, res) {
    const currentAdminId = req.admin?.adminId;
    if (!currentAdminId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const isActive = await admin_user_service_1.AdminUserService.toggleAdminActive(req.params.id, currentAdminId);
    (0, response_1.sendSuccess)(res, { isActive }, `Admin ${isActive ? 'activated' : 'deactivated'}`);
}
//# sourceMappingURL=adminUser.controller.js.map