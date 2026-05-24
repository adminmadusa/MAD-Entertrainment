"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const redis_1 = require("../config/redis");
const router = (0, express_1.Router)();
const mongoose_1 = __importDefault(require("mongoose"));
router.get('/', (_req, res) => {
    const mongoState = mongoose_1.default.connection.readyState;
    const dbStatus = mongoState === 1 ? 'connected' : 'disconnected';
    res.json({
        success: true,
        status: dbStatus === 'connected' ? 'ok' : 'degraded',
        redisConnected: (0, redis_1.isRedisConnected)(),
        mongoConnected: dbStatus === 'connected',
        mongoConnectionState: mongoState,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
    });
});
exports.default = router;
//# sourceMappingURL=health.routes.js.map