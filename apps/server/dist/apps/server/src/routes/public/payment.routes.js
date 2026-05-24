"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../../controllers/public/payment.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rate_middleware_1 = require("../../middleware/rate.middleware");
const router = (0, express_1.Router)();
// ─── Secure payment endpoints ─────────────────────────────────────
router.post('/create-intent', auth_middleware_1.optionalAuth, rate_middleware_1.paymentLimiter, payment_controller_1.createPaymentIntent);
router.post('/verify', auth_middleware_1.optionalAuth, rate_middleware_1.paymentLimiter, payment_controller_1.verifyPayment);
router.post('/webhook/stripe', payment_controller_1.stripeWebhook);
router.post('/webhook/razorpay', payment_controller_1.razorpayWebhook);
exports.default = router;
//# sourceMappingURL=payment.routes.js.map