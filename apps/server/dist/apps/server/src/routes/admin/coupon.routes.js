"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validations_1 = require("@mad/validations");
const express_1 = require("express");
const coupon_controller_1 = require("../../controllers/admin/coupon.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAdmin);
router.get('/', coupon_controller_1.listCoupons);
router.post('/', (0, validate_middleware_1.validate)(validations_1.createCouponSchema), coupon_controller_1.createCoupon);
router.get('/:id', coupon_controller_1.getCoupon);
router.put('/:id', (0, validate_middleware_1.validate)(validations_1.updateCouponSchema), coupon_controller_1.updateCoupon);
router.delete('/:id', coupon_controller_1.deleteCoupon);
router.patch('/:id/toggle', coupon_controller_1.toggleCoupon);
exports.default = router;
//# sourceMappingURL=coupon.routes.js.map