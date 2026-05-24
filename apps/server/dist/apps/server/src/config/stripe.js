"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initStripe = initStripe;
exports.getStripe = getStripe;
exports.isStripeEnabled = isStripeEnabled;
const stripe_1 = __importDefault(require("stripe"));
const env_1 = require("./env");
let stripe;
function initStripe() {
    const key = (0, env_1.getEnv)().STRIPE_SECRET_KEY;
    if (!key)
        return undefined;
    stripe = new stripe_1.default(key);
    return stripe;
}
function getStripe() {
    const instance = stripe ?? initStripe();
    if (!instance)
        throw new Error('Stripe is not configured');
    return instance;
}
function isStripeEnabled() {
    return Boolean((0, env_1.getEnv)().STRIPE_SECRET_KEY);
}
//# sourceMappingURL=stripe.js.map