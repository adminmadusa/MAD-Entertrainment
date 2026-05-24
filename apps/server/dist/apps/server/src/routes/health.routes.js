"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const razorpay_1 = require("../config/razorpay");
const redis_1 = require("../config/redis");
const socket_1 = require("../config/socket");
const stripe_1 = require("../config/stripe");
const router = (0, express_1.Router)();
/**
 * GET /api/health
 * Returns server status, DB connectivity, and service availability
 */
router.get('/', (req, res) => {
    const env = (0, env_1.getEnv)();
    const dbConnected = (0, database_1.isDatabaseConnected)();
    const redisConnected = (0, redis_1.isRedisConnected)();
    let socketReady = false;
    try {
        socketReady = !!(0, socket_1.getIO)();
    }
    catch {
        // not initialized yet
    }
    const isHealthy = dbConnected && redisConnected && socketReady;
    const status = {
        status: isHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: env.NODE_ENV,
        envValidation: 'valid',
        services: {
            database: dbConnected ? 'connected' : 'disconnected',
            redis: redisConnected ? 'connected' : 'disconnected',
            socketio: socketReady ? 'connected' : 'disconnected',
            razorpay: (0, razorpay_1.isRazorpayEnabled)() ? 'enabled' : 'disabled',
            stripe: (0, stripe_1.isStripeEnabled)() ? 'enabled' : 'disabled',
        },
        version: '1.0.0',
    };
    const httpStatus = isHealthy ? 200 : 503;
    res.status(httpStatus).json(status);
});
exports.default = router;
//# sourceMappingURL=health.routes.js.map