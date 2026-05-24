"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const database_1 = require("./config/database");
const cloudinary_1 = require("./config/cloudinary");
const razorpay_1 = require("./config/razorpay");
const stripe_1 = require("./config/stripe");
const socket_1 = require("./config/socket");
const logger_1 = require("./utils/logger");
const PORT = parseInt(process.env.PORT ?? '5000', 10);
async function bootstrap() {
    // ─── Initialize Services ───────────────────────────────────
    await (0, database_1.connectDatabase)();
    (0, cloudinary_1.initCloudinary)();
    (0, razorpay_1.initRazorpay)();
    (0, stripe_1.initStripe)();
    // ─── Create HTTP Server ────────────────────────────────────
    const app = (0, app_1.createApp)();
    const httpServer = http_1.default.createServer(app);
    // ─── Initialize Socket.IO ──────────────────────────────────
    (0, socket_1.initSocketIO)(httpServer);
    // ─── Start Listening ───────────────────────────────────────
    httpServer.listen(PORT, () => {
        logger_1.logger.info(`🚀 MAD Entertrainment API running on http://localhost:${PORT}`);
        logger_1.logger.info(`📡 WebSocket server ready on ws://localhost:${PORT}`);
        logger_1.logger.info(`🏥 Health check: http://localhost:${PORT}/api/health`);
        logger_1.logger.info(`🌍 Environment: ${process.env.NODE_ENV ?? 'development'}`);
    });
    // ─── Graceful Shutdown ────────────────────────────────────
    const shutdown = async (signal) => {
        logger_1.logger.info(`📴 Received ${signal}. Starting graceful shutdown...`);
        httpServer.close(async () => {
            logger_1.logger.info('HTTP server closed');
            await (0, database_1.disconnectDatabase)();
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