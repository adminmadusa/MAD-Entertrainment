"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminUser_controller_1 = require("../../controllers/admin/adminUser.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const shared_1 = require("@mad/shared");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const shared_2 = require("@mad/shared");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAdmin);
// Only super_admin can manage admin users
router.use((0, auth_middleware_1.requireRole)(shared_1.AdminRole.SUPER_ADMIN));
router.get('/', adminUser_controller_1.listAdmins);
router.post('/', (0, validate_middleware_1.validate)(shared_2.createAdminSchema), adminUser_controller_1.createAdminUser);
router.patch('/:id/toggle', adminUser_controller_1.toggleAdminActive);
exports.default = router;
//# sourceMappingURL=adminUser.routes.js.map