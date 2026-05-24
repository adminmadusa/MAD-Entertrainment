"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
require("express-async-errors");
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const openapi_1 = require("./config/openapi");
const env_1 = require("./config/env");
const cache_middleware_1 = require("./middleware/cache.middleware");
const correlation_middleware_1 = require("./middleware/correlation.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
const rate_middleware_1 = require("./middleware/rate.middleware");
const routes_1 = __importDefault(require("./routes"));
const logger_1 = require("./utils/logger");
function createApp() {
    const app = (0, express_1.default)();
    const env = (0, env_1.getEnv)();
    // ─── Trust Proxy (for Vercel/Railway/Render) ─────────────
    app.set('trust proxy', 1);
    // ─── Request Correlation ──────────────────────────────────
    app.use(correlation_middleware_1.correlationMiddleware);
    // ─── Security Headers ─────────────────────────────────────
    app.use((0, helmet_1.default)({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: false, // CSP is handled by Next.js
    }));
    // ─── CORS ──────────────────────────────────────────────────
    const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
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
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'X-Request-ID',
            'x-session-id',
            'Cache-Control',
            'Pragma',
        ],
    }));
    // ─── Compression ───────────────────────────────────────────
    app.use((0, compression_1.default)());
    // ─── Body Parsers ──────────────────────────────────────────
    app.use(express_1.default.json({
        limit: '10mb',
        verify: (req, res, buf) => {
            if (req.originalUrl && req.originalUrl.includes('/webhook/')) {
                req.rawBody = buf;
            }
        }
    }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // ─── Request Logging ──────────────────────────────────────
    if (env.NODE_ENV !== 'test') {
        app.use((0, morgan_1.default)((tokens, req, res) => {
            const method = tokens.method(req, res);
            const url = tokens.url(req, res);
            const status = tokens.status(req, res);
            const responseTime = tokens['response-time'](req, res);
            const log = req.log || logger_1.logger;
            log.info(`${method} ${url} ${status} - ${responseTime} ms`);
            return null;
        }, {
            skip: (req) => req.path === '/api/health',
        }));
    }
    // ─── API Cache Policy ─────────────────────────────────────
    app.use('/api', cache_middleware_1.noStoreApiCache);
    // ─── General Rate Limiter ─────────────────────────────────
    app.use('/api', rate_middleware_1.generalLimiter);
    // ─── API Docs ─────────────────────────────────────────────
    app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup((0, openapi_1.generateOpenApiDocument)()));
    // ─── API Routes ───────────────────────────────────────────
    app.use('/api', routes_1.default);
    // ─── 404 Handler ──────────────────────────────────────────
    app.use(error_middleware_1.notFoundHandler);
    // ─── Global Error Handler ─────────────────────────────────
    app.use(error_middleware_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map