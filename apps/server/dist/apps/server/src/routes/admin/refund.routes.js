"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const refund_controller_1 = require("../../controllers/admin/refund.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAdmin);
router.get('/', refund_controller_1.listRefunds);
router.post('/', refund_controller_1.createRefund);
router.patch('/:id/process', refund_controller_1.processRefund);
exports.default = router;
//# sourceMappingURL=refund.routes.js.map