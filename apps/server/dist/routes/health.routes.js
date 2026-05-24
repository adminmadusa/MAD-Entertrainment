"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const razorpay_1 = require("../config/razorpay");
const stripe_1 = require("../config/stripe");
const router = (0, express_1.Router)();
/**
 * GET /api/health
 * Returns server status, DB connectivity, and service availability
 */
router.get('/', (req, res) => {
    const dbConnected = (0, database_1.isDatabaseConnected)();
    const status = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV ?? 'development',
        services: {
            database: dbConnected ? 'connected' : 'disconnected',
            razorpay: (0, razorpay_1.isRazorpayEnabled)() ? 'enabled' : 'disabled',
            stripe: (0, stripe_1.isStripeEnabled)() ? 'enabled' : 'disabled',
        },
        version: '1.0.0',
    };
    const httpStatus = dbConnected ? 200 : 503;
    res.status(httpStatus).json(status);
});
exports.default = router;
//# sourceMappingURL=health.routes.js.map