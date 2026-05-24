"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendCreated = sendCreated;
exports.sendError = sendError;
exports.sendNotFound = sendNotFound;
exports.sendUnauthorized = sendUnauthorized;
exports.sendForbidden = sendForbidden;
exports.sendValidationError = sendValidationError;
exports.sendPaginated = sendPaginated;
exports.buildPaginationMeta = buildPaginationMeta;
exports.parsePaginationParams = parsePaginationParams;
const shared_1 = require("@mad/shared");
// ─── Success Response ─────────────────────────────────────────
function sendSuccess(res, data, message = 'Success', statusCode = shared_1.HTTP_STATUS.OK) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
}
// ─── Created Response ─────────────────────────────────────────
function sendCreated(res, data, message = 'Created successfully') {
    return sendSuccess(res, data, message, shared_1.HTTP_STATUS.CREATED);
}
// ─── Error Response ───────────────────────────────────────────
function sendError(res, message = 'An error occurred', statusCode = shared_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, errors) {
    return res.status(statusCode).json({
        success: false,
        message,
        ...(errors && { errors }),
    });
}
// ─── Not Found Response ───────────────────────────────────────
function sendNotFound(res, resource = 'Resource') {
    return sendError(res, `${resource} not found`, shared_1.HTTP_STATUS.NOT_FOUND);
}
// ─── Unauthorized Response ────────────────────────────────────
function sendUnauthorized(res, message = 'Unauthorized') {
    return sendError(res, message, shared_1.HTTP_STATUS.UNAUTHORIZED);
}
// ─── Forbidden Response ───────────────────────────────────────
function sendForbidden(res, message = 'Access denied') {
    return sendError(res, message, shared_1.HTTP_STATUS.FORBIDDEN);
}
// ─── Validation Error Response ────────────────────────────────
function sendValidationError(res, errors) {
    return res.status(shared_1.HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Validation failed',
        errors,
    });
}
function sendPaginated(res, data, pagination, message = 'Success') {
    return res.status(shared_1.HTTP_STATUS.OK).json({
        success: true,
        message,
        data,
        pagination,
    });
}
// ─── Build Pagination Meta ────────────────────────────────────
function buildPaginationMeta(total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
    };
}
// ─── Parse Pagination Params ──────────────────────────────────
function parsePaginationParams(query) {
    const page = Math.max(1, parseInt(String(query.page ?? '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '12'), 10)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
//# sourceMappingURL=response.js.map