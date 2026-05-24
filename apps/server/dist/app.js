"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const error_middleware_1 = require("./middleware/error.middleware");
const rateLimiter_middleware_1 = require("./middleware/rateLimiter.middleware");
const routes_1 = __importDefault(require("./routes"));
const logger_1 = require("./utils/logger");
function createApp() {
    const app = (0, express_1.default)();
    // ─── Trust Proxy (for Vercel/Railway/Render) ─────────────
    app.set('trust proxy', 1);
    // ─── Security Headers ─────────────────────────────────────
    app.use((0, helmet_1.default)({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: false, // CSP is handled by Next.js
    }));
    // ─── CORS ──────────────────────────────────────────────────
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()) ?? [
        'http://localhost:3000',
    ];
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error(`CORS: Origin ${origin} not allowed`));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));
    // ─── Compression ───────────────────────────────────────────
    app.use((0, compression_1.default)());
    // ─── Body Parsers ──────────────────────────────────────────
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // ─── Request Logging ──────────────────────────────────────
    if (process.env.NODE_ENV !== 'test') {
        app.use((0, morgan_1.default)('combined', {
            stream: {
                write: (message) => logger_1.logger.info(message.trim()),
            },
            skip: (req) => req.path === '/api/health',
        }));
    }
    // ─── General Rate Limiter ─────────────────────────────────
    app.use('/api', rateLimiter_middleware_1.generalLimiter);
    // ─── API Routes ───────────────────────────────────────────
    app.use('/api', routes_1.default);
    // ─── 404 Handler ──────────────────────────────────────────
    app.use(error_middleware_1.notFoundHandler);
    // ─── Global Error Handler ─────────────────────────────────
    app.use(error_middleware_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map