"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../../controllers/admin/analytics.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAdmin);
router.get('/summary', analytics_controller_1.getDashboardSummary);
router.get('/revenue', analytics_controller_1.getRevenueChart);
router.get('/events/:eventId', analytics_controller_1.getEventAnalytics);
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map