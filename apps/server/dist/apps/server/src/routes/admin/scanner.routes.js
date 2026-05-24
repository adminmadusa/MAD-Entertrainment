"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("@mad/shared");
const express_1 = require("express");
const scanner_controller_1 = require("../../controllers/admin/scanner.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Protect all scanner routes
router.use(auth_middleware_1.requireAdmin);
router.use((0, auth_middleware_1.requireRole)(shared_1.AdminRole.SUPER_ADMIN, shared_1.AdminRole.MANAGER, shared_1.AdminRole.SCANNER));
// Scan a ticket
router.post('/scan', scanner_controller_1.scanTicket);
exports.default = router;
//# sourceMappingURL=scanner.routes.js.map