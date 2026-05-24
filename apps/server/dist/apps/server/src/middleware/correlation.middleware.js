"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationMiddleware = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../utils/logger");
const correlationMiddleware = (req, res, next) => {
    const requestId = req.header('x-request-id') || crypto_1.default.randomUUID();
    req.id = requestId;
    req.log = logger_1.logger.child({ requestId });
    res.setHeader('x-request-id', requestId);
    next();
};
exports.correlationMiddleware = correlationMiddleware;
//# sourceMappingURL=correlation.middleware.js.map