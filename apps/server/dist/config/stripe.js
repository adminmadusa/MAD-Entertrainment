"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initStripe = initStripe;
exports.getStripe = getStripe;
exports.isStripeEnabled = isStripeEnabled;
const stripe_1 = __importDefault(require("stripe"));
const logger_1 = require("../utils/logger");
let stripeInstance = null;
function initStripe() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        logger_1.logger.warn('⚠️  Stripe secret key missing — Stripe payments will be disabled');
        return null;
    }
    stripeInstance = new stripe_1.default(secretKey, {
        apiVersion: '2025-02-24.acacia',
        typescript: true,
    });
    logger_1.logger.info('✅ Stripe initialized');
    return stripeInstance;
}
function getStripe() {
    if (!stripeInstance) {
        throw new Error('Stripe is not initialized. Call initStripe() first.');
    }
    return stripeInstance;
}
function isStripeEnabled() {
    return stripeInstance !== null;
}
//# sourceMappingURL=stripe.js.map