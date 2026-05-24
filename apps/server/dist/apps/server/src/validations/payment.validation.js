"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreateOrder = exports.createOrderSchema = void 0;
const zod_1 = require("zod");
const error_middleware_1 = require("../middleware/error.middleware");
exports.createOrderSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    tickets: zod_1.z.array(zod_1.z.object({
        tier: zod_1.z.string(),
        quantity: zod_1.z.number().int().positive(),
        seats: zod_1.z.array(zod_1.z.object({
            seatId: zod_1.z.string(),
            row: zod_1.z.string(),
            number: zod_1.z.number().int(),
            section: zod_1.z.string().optional(),
        })).optional(),
    })),
    guestName: zod_1.z.string().optional(),
    guestEmail: zod_1.z.string().email().optional(),
    guestPhone: zod_1.z.string().optional(),
    couponCode: zod_1.z.string().optional(),
});
const validateCreateOrder = (req, res, next) => {
    const result = exports.createOrderSchema.safeParse(req.body);
    if (!result.success) {
        return next(error_middleware_1.AppError.badRequest('Invalid request payload'));
    }
    req.body = result.data;
    next();
};
exports.validateCreateOrder = validateCreateOrder;
//# sourceMappingURL=payment.validation.js.map