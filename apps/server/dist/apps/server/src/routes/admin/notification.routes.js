"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../../controllers/admin/notification.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAdmin);
router.get('/', notification_controller_1.listNotifications);
router.post('/:id/retry', notification_controller_1.retryNotification);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map