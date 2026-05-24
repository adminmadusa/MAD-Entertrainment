"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendCreated = sendCreated;
exports.sendError = sendError;
exports.sendUnauthorized = sendUnauthorized;
exports.sendForbidden = sendForbidden;
const shared_1 = require("@mad/shared");
function sendSuccess(res, data, message = 'Success', statusCode = shared_1.HTTP_STATUS.OK) {
    res.status(statusCode).json({ success: true, message, data });
}
function sendCreated(res, data, message = 'Created') {
    sendSuccess(res, data, message, shared_1.HTTP_STATUS.CREATED);
}
function sendError(res, message, statusCode = shared_1.HTTP_STATUS.BAD_REQUEST, errors) {
    res.status(statusCode).json({ success: false, message, ...(errors ? { errors } : {}) });
}
function sendUnauthorized(res, message = 'Unauthorized') {
    sendError(res, message, shared_1.HTTP_STATUS.UNAUTHORIZED);
}
function sendForbidden(res, message = 'Forbidden') {
    sendError(res, message, shared_1.HTTP_STATUS.FORBIDDEN);
}
//# sourceMappingURL=response.js.map