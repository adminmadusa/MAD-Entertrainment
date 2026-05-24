"use strict";
// utils/errorHandler.ts
// Central utility for handling async route errors and providing a uniform error response.
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncWrapper = asyncWrapper;
exports.errorMiddleware = errorMiddleware;
const logger_1 = require("./logger");
// Wrap async route handlers to forward rejected promises to Express error handling.
function asyncWrapper(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}
// Generic error middleware – logs the error and sends a JSON response.
function errorMiddleware(err, _req, res, _next) {
    logger_1.logger.error({ err }, 'Unhandled error');
    const status = err.status ?? 500;
    const message = err.message ?? 'Internal server error';
    res.status(status).json({ success: false, message });
}
//# sourceMappingURL=errorHandler.js.map