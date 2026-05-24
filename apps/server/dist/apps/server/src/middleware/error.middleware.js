"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = exports.AppError = void 0;
const shared_1 = require("@mad/shared");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
class AppError extends Error {
    statusCode;
    errors;
    isOperational;
    constructor(message, statusCode = shared_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, errors, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
    }
    static badRequest(message, errors) {
        return new AppError(message, shared_1.HTTP_STATUS.BAD_REQUEST, errors);
    }
    static unauthorized(message = 'Unauthorized') {
        return new AppError(message, shared_1.HTTP_STATUS.UNAUTHORIZED);
    }
    static forbidden(message = 'Access denied') {
        return new AppError(message, shared_1.HTTP_STATUS.FORBIDDEN);
    }
    static notFound(resource = 'Resource') {
        const message = resource.endsWith('not found') ? resource : `${resource} not found`;
        return new AppError(message, shared_1.HTTP_STATUS.NOT_FOUND);
    }
    static conflict(message) {
        return new AppError(message, shared_1.HTTP_STATUS.CONFLICT);
    }
}
exports.AppError = AppError;
const notFoundHandler = (req, res) => {
    res.status(shared_1.HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`,
    });
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (err, req, res, _next) => {
    const reqLogger = req.log ?? logger_1.logger;
    if (err instanceof AppError) {
        reqLogger.warn({ statusCode: err.statusCode, path: req.path }, err.message);
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            ...(err.errors ? { errors: err.errors } : {}),
        });
        return;
    }
    if (err?.name === 'ValidationError') {
        res.status(shared_1.HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
            success: false,
            message: 'Validation failed',
            errors: parseMongooseValidationError(err),
        });
        return;
    }
    if (err?.code === 11000 || err?.code === '11000') {
        res.status(shared_1.HTTP_STATUS.CONFLICT).json({ success: false, message: 'Duplicate entry' });
        return;
    }
    const env = (0, env_1.getEnv)();
    reqLogger.error({ err, path: req.path }, 'Unhandled request error');
    res.status(shared_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: env.NODE_ENV === 'production' ? 'An internal server error occurred' : err.message,
        ...(env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
    });
};
exports.errorHandler = errorHandler;
function parseMongooseValidationError(err) {
    const errors = {};
    for (const [field, value] of Object.entries(err.errors ?? {})) {
        errors[field] = [value.message ?? 'Invalid value'];
    }
    return errors;
}
//# sourceMappingURL=error.middleware.js.map