"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const env_1 = require("./config/env");
// Validate env variables first
(0, env_1.validateEnv)();
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const cloudinary_1 = require("./config/cloudinary");
const database_1 = require("./config/database");
const razorpay_1 = require("./config/razorpay");
const redis_1 = require("./config/redis");
const instrument_1 = require("./instrument");
(0, instrument_1.initializeSentry)();
const socket_1 = require("./config/socket");
const stripe_1 = require("./config/stripe");
const logger_1 = require("./utils/logger");
const consistency_worker_1 = require("./workers/consistency.worker");
const workers_1 = require("./workers");
const env = (0, env_1.getEnv)();
const PORT = env.PORT;
let isBootstrapping = false;
async function bootstrap() {
    if (isBootstrapping)
        return;
    isBootstrapping = true;
    // ─── Initialize Services ───────────────────────────────────
    await (0, database_1.connectDatabase)();
    // Connect Redis and await connection readiness
    try {
        (0, redis_1.getRedis)();
        await (0, redis_1.waitForRedisReady)();
    }
    catch (err) {
        logger_1.logger.warn({ err }, 'Redis connection failed during bootstrap. Starting in degraded mode.');
    }
    (0, cloudinary_1.initCloudinary)();
    (0, razorpay_1.initRazorpay)();
    (0, stripe_1.initStripe)();
    // ─── Create HTTP Server ────────────────────────────────────
    const app = (0, app_1.createApp)();
    const httpServer = http_1.default.createServer(app);
    // ─── Initialize Socket.IO ──────────────────────────────────
    (0, socket_1.initSocketIO)(httpServer);
    (0, consistency_worker_1.startConsistencyWorker)();
    (0, workers_1.startAllWorkers)();
    // ─── Start Listening ───────────────────────────────────────
    httpServer.listen(PORT, () => {
        logger_1.logger.info(`🚀 MAD Entertrainment API running on http://localhost:${PORT}`);
        logger_1.logger.info(`📡 WebSocket server ready on ws://localhost:${PORT}`);
        logger_1.logger.info(`🏥 Health check: http://localhost:${PORT}/api/health`);
        logger_1.logger.info(`🌍 Environment: ${env.NODE_ENV}`);
    });
    // ─── Graceful Shutdown ────────────────────────────────────
    const shutdown = async (signal) => {
        logger_1.logger.info(`📴 Received ${signal}. Starting graceful shutdown...`);
        httpServer.close(async () => {
            logger_1.logger.info('HTTP server closed');
            try {
                (0, socket_1.getIO)().close();
                logger_1.logger.info('Socket.IO connections closed');
            }
            catch (err) {
                // Socket may not be fully initialized or already closed
            }
            (0, consistency_worker_1.stopConsistencyWorker)();
            await (0, workers_1.stopAllWorkers)();
            await (0, database_1.disconnectDatabase)();
            await (0, redis_1.disconnectRedis)();
            logger_1.logger.info('✅ Graceful shutdown complete');
            process.exit(0);
        });
        // Force exit after 10 seconds
        setTimeout(() => {
            logger_1.logger.error('⚠️  Forceful shutdown after timeout');
            process.exit(1);
        }, 10000);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    // ─── Unhandled Rejections ─────────────────────────────────
    process.on('unhandledRejection', (reason) => {
        logger_1.logger.fatal({ reason }, '❌ Unhandled Promise Rejection');
        process.exit(1);
    });
    process.on('uncaughtException', (err) => {
        logger_1.logger.fatal({ err }, '❌ Uncaught Exception');
        process.exit(1);
    });
}
bootstrap().catch((err) => {
    logger_1.logger.fatal({ err }, '❌ Failed to start server');
    process.exit(1);
});
//# sourceMappingURL=server.js.map