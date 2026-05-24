"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponService = void 0;
const Coupon_model_1 = require("../models/Coupon.model");
const error_middleware_1 = require("../middleware/error.middleware");
class CouponService {
    static async listCoupons(active, page, limit) {
        const skip = (page - 1) * limit;
        const filter = {};
        if (active === 'true')
            filter['isActive'] = true;
        if (active === 'false')
            filter['isActive'] = false;
        const [coupons, total] = await Promise.all([
            Coupon_model_1.Coupon.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Coupon_model_1.Coupon.countDocuments(filter),
        ]);
        return { coupons, total };
    }
    static async getCouponById(id) {
        const coupon = await Coupon_model_1.Coupon.findById(id);
        if (!coupon) {
            throw error_middleware_1.AppError.notFound('Coupon');
        }
        return coupon;
    }
    static async createCoupon(data) {
        const code = data.code?.toUpperCase();
        const existing = await Coupon_model_1.Coupon.findOne({ code });
        if (existing) {
            throw error_middleware_1.AppError.conflict(`Coupon code "${code}" already exists`);
        }
        return await Coupon_model_1.Coupon.create(data);
    }
    static async updateCoupon(id, data) {
        // If updating code, check uniqueness
        if (data.code) {
            const code = data.code.toUpperCase();
            const existing = await Coupon_model_1.Coupon.findOne({ code, _id: { $ne: id } });
            if (existing) {
                throw error_middleware_1.AppError.conflict(`Coupon code "${code}" already exists`);
            }
        }
        const coupon = await Coupon_model_1.Coupon.findByIdAndUpdate(id, data, { new: true, runValidators: true });
        if (!coupon) {
            throw error_middleware_1.AppError.notFound('Coupon');
        }
        return coupon;
    }
    static async deleteCoupon(id) {
        const coupon = await Coupon_model_1.Coupon.findByIdAndDelete(id);
        if (!coupon) {
            throw error_middleware_1.AppError.notFound('Coupon');
        }
    }
    static async toggleCouponActive(id) {
        const coupon = await Coupon_model_1.Coupon.findById(id);
        if (!coupon) {
            throw error_middleware_1.AppError.notFound('Coupon');
        }
        coupon.isActive = !coupon.isActive;
        await coupon.save();
        return coupon.isActive;
    }
}
exports.CouponService = CouponService;
//# sourceMappingURL=coupon.service.js.map