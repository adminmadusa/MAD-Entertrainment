"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayUnavailableError = exports.InsufficientAmountError = exports.PaymentError = void 0;
const error_middleware_1 = require("../../middleware/error.middleware");
const shared_1 = require("@mad/shared");
class PaymentError extends error_middleware_1.AppError {
    constructor(message, status = shared_1.HTTP_STATUS.BAD_REQUEST, errors) {
        super(message, status, errors, false);
    }
}
exports.PaymentError = PaymentError;
class InsufficientAmountError extends PaymentError {
    constructor() {
        super('Amount must be at least 1 INR (100 paise) for Razorpay transactions', shared_1.HTTP_STATUS.BAD_REQUEST);
    }
}
exports.InsufficientAmountError = InsufficientAmountError;
class GatewayUnavailableError extends PaymentError {
    constructor(gateway) {
        super(`${gateway} integration is disabled`);
    }
}
exports.GatewayUnavailableError = GatewayUnavailableError;
//# sourceMappingURL=payment.errors.js.map