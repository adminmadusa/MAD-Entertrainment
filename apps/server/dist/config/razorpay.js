"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRazorpay = initRazorpay;
exports.getRazorpay = getRazorpay;
exports.isRazorpayEnabled = isRazorpayEnabled;
const razorpay_1 = __importDefault(require("razorpay"));
const logger_1 = require("../utils/logger");
let razorpayInstance = null;
function initRazorpay() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
        logger_1.logger.warn('⚠️  Razorpay credentials missing — Razorpay payments will be disabled');
        return null;
    }
    razorpayInstance = new razorpay_1.default({
        key_id: keyId,
        key_secret: keySecret,
    });
    logger_1.logger.info('✅ Razorpay initialized');
    return razorpayInstance;
}
function getRazorpay() {
    if (!razorpayInstance) {
        throw new Error('Razorpay is not initialized. Call initRazorpay() first.');
    }
    return razorpayInstance;
}
function isRazorpayEnabled() {
    return razorpayInstance !== null;
}
//# sourceMappingURL=razorpay.js.map