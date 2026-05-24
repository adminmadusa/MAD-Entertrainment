"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validations_1 = require("@mad/validations");
const express_1 = require("express");
const auth_controller_1 = require("../../controllers/admin/auth.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rate_middleware_1 = require("../../middleware/rate.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const router = (0, express_1.Router)();
/**
 * POST /api/admin/auth/login
 * Public — rate limited to 10 attempts per 15 min
 */
router.post('/login', rate_middleware_1.authLimiter, (0, validate_middleware_1.validate)(validations_1.adminLoginSchema), auth_controller_1.adminLogin);
/**
 * GET /api/admin/auth/me
 * Protected — requires valid admin JWT
 */
router.get('/me', auth_middleware_1.requireAdmin, auth_controller_1.adminMe);
/**
 * POST /api/admin/auth/logout
 * Protected — audit log only (token cleared client-side)
 */
router.post('/logout', auth_middleware_1.requireAdmin, auth_controller_1.adminLogout);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map