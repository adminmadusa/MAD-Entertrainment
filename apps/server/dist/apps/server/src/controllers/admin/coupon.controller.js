"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCoupons = listCoupons;
exports.getCoupon = getCoupon;
exports.createCoupon = createCoupon;
exports.updateCoupon = updateCoupon;
exports.deleteCoupon = deleteCoupon;
exports.toggleCoupon = toggleCoupon;
const coupon_service_1 = require("../../services/admin/coupon.service");
const response_1 = require("../../utils/response");
async function listCoupons(req, res) {
    const { page, limit } = (0, response_1.parsePaginationParams)(req.query);
    const { active } = req.query;
    const { coupons, total } = await coupon_service_1.CouponService.listCoupons(active, page, limit);
    (0, response_1.sendPaginated)(res, coupons, (0, response_1.buildPaginationMeta)(total, page, limit));
}
async function getCoupon(req, res) {
    const coupon = await coupon_service_1.CouponService.getCouponById(req.params.id);
    (0, response_1.sendSuccess)(res, coupon);
}
async function createCoupon(req, res) {
    const body = req.body;
    const coupon = await coupon_service_1.CouponService.createCoupon(body);
    (0, response_1.sendCreated)(res, coupon, 'Coupon created successfully');
}
async function updateCoupon(req, res) {
    const body = req.body;
    const coupon = await coupon_service_1.CouponService.updateCoupon(req.params.id, body);
    (0, response_1.sendSuccess)(res, coupon, 'Coupon updated successfully');
}
async function deleteCoupon(req, res) {
    await coupon_service_1.CouponService.deleteCoupon(req.params.id);
    (0, response_1.sendSuccess)(res, null, 'Coupon deleted successfully');
}
async function toggleCoupon(req, res) {
    const isActive = await coupon_service_1.CouponService.toggleCouponActive(req.params.id);
    (0, response_1.sendSuccess)(res, { isActive }, `Coupon ${isActive ? 'activated' : 'deactivated'}`);
}
//# sourceMappingURL=coupon.controller.js.map