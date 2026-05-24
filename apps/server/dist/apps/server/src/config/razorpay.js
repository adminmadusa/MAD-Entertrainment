"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRazorpay = initRazorpay;
exports.getRazorpay = getRazorpay;
exports.isRazorpayEnabled = isRazorpayEnabled;
const razorpay_1 = __importDefault(require("razorpay"));
const env_1 = require("./env");
let razorpay;
function initRazorpay() {
    const env = (0, env_1.getEnv)();
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET)
        return undefined;
    razorpay = new razorpay_1.default({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
    return razorpay;
}
function getRazorpay() {
    const instance = razorpay ?? initRazorpay();
    if (!instance)
        throw new Error('Razorpay is not configured');
    return instance;
}
function isRazorpayEnabled() {
    const env = (0, env_1.getEnv)();
    return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}
//# sourceMappingURL=razorpay.js.map