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
const env_1 = require("./config/env");
const cache_middleware_1 = require("./middleware/cache.middleware");
const correlation_middleware_1 = require("./middleware/correlation.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
const rate_middleware_1 = require("./middleware/rate.middleware");
const routes_1 = __importDefault(require("./routes"));
const logger_1 = require("./utils/logger");
const metrics_1 = require("./monitoring/metrics");
function createApp() {
    const app = (0, express_1.default)();
    const env = (0, env_1.getEnv)();
    // ─── Trust Proxy (for Vercel/Railway/Render) ─────────────
    app.set('trust proxy', 1);
    // ─── Request Correlation ──────────────────────────────────
    app.use(correlation_middleware_1.correlationMiddleware);
    // ─── Request Metrics ─────────────────────────────────────
    app.use((req, res, next) => {
        const end = metrics_1.httpRequestDurationMicroseconds.startTimer();
        res.on('finish', () => {
            end({ method: req.method, route: req.path, code: res.statusCode });
            const log = req.log || logger_1.logger;
            log.info({ method: req.method, path: req.path, status: res.statusCode }, 'request completed');
        });
        next();
    });
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
    app.use(express_1.default.json({ limit: '10mb' }));
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
    // ─── API Routes ───────────────────────────────────────────
    app.use('/api', routes_1.default);
    // ─── Metrics Endpoint ─────────────────────────────────────
    if (env.NODE_ENV !== 'test') {
        app.get('/metrics', async (req, res) => {
            try {
                const metrics = await metrics_1.register.metrics();
                res.set('Content-Type', metrics_1.register.contentType);
                res.end(metrics);
            }
            catch (ex) {
                res.status(500).end(ex.toString());
            }
        });
    }
    // ─── 404 Handler ──────────────────────────────────────────
    app.use(error_middleware_1.notFoundHandler);
    // ─── Global Error Handler ─────────────────────────────────
    app.use(error_middleware_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map