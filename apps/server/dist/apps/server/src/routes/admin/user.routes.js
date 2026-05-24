"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("@mad/shared");
const validations_1 = require("@mad/validations");
const express_1 = require("express");
const user_controller_1 = require("../../controllers/admin/user.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAdmin);
// Only super_admin can manage admin users
router.use((0, auth_middleware_1.requireRole)(shared_1.AdminRole.SUPER_ADMIN));
router.get('/', user_controller_1.listAdmins);
router.post('/', (0, validate_middleware_1.validate)(validations_1.createAdminSchema), user_controller_1.createAdminUser);
router.patch('/:id/toggle', user_controller_1.toggleAdminActive);
exports.default = router;
//# sourceMappingURL=user.routes.js.map