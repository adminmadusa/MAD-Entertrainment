"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const logger_1 = require("../utils/logger");
const shared_1 = require("@mad/shared");
// ─── App Error Class ──────────────────────────────────────────
class AppError extends Error {
    constructor(message, statusCode = shared_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, errors, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.errors = errors;
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
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
        return new AppError(`${resource} not found`, shared_1.HTTP_STATUS.NOT_FOUND);
    }
    static conflict(message) {
        return new AppError(message, shared_1.HTTP_STATUS.CONFLICT);
    }
    static tooManyRequests(message = 'Too many requests') {
        return new AppError(message, shared_1.HTTP_STATUS.TOO_MANY_REQUESTS);
    }
}
exports.AppError = AppError;
// ─── Global Error Handler ─────────────────────────────────────
function errorHandler(err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) {
    // Operational app errors
    if (err instanceof AppError) {
        logger_1.logger.warn({ statusCode: err.statusCode, path: req.path, method: req.method }, err.message);
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            ...(err.errors && { errors: err.errors }),
        });
        return;
    }
    // Mongoose validation errors
    if (err.name === 'ValidationError') {
        logger_1.logger.warn({ err }, 'Mongoose validation error');
        res.status(shared_1.HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
            success: false,
            message: 'Validation failed',
            errors: parseMongooseValidationError(err),
        });
        return;
    }
    // Mongoose duplicate key error
    if (err.code === '11000') {
        logger_1.logger.warn({ err }, 'Mongoose duplicate key error');
        res.status(shared_1.HTTP_STATUS.CONFLICT).json({
            success: false,
            message: 'Duplicate entry — this record already exists',
        });
        return;
    }
    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        res.status(shared_1.HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: 'Invalid ID format',
        });
        return;
    }
    // JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        res.status(shared_1.HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: 'Invalid or expired token',
        });
        return;
    }
    // Unknown errors — log and mask in production
    logger_1.logger.error({ err, path: req.path, method: req.method }, '❌ Unhandled error');
    res.status(shared_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: process.env.NODE_ENV === 'production'
            ? 'An internal server error occurred'
            : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
}
// ─── Not Found Handler ────────────────────────────────────────
function notFoundHandler(req, res) {
    res.status(shared_1.HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`,
    });
}
// ─── Helpers ──────────────────────────────────────────────────
function parseMongooseValidationError(err) {
    const errors = {};
    const validationError = err;
    if (validationError.errors) {
        for (const [field, value] of Object.entries(validationError.errors)) {
            errors[field] = [value.message];
        }
    }
    return errors;
}
//# sourceMappingURL=error.middleware.js.map