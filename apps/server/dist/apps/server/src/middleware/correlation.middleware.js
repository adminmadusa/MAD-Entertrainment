"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationMiddleware = correlationMiddleware;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../utils/logger");
function correlationMiddleware(req, res, next) {
    // Extract custom header or generate correlation ID
    const requestId = req.headers['x-request-id'] || crypto_1.default.randomUUID();
    req.id = requestId;
    res.setHeader('x-request-id', requestId);
    // Attach a child logger with the requestId context
    req.log = logger_1.logger.child({ requestId });
    next();
}
//# sourceMappingURL=correlation.middleware.js.map