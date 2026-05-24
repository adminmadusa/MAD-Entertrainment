"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const isDev = process.env.NODE_ENV !== 'production';
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
    base: { service: 'mad-server' },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    formatters: {
        level(label) {
            return { level: label };
        },
    },
}, isDev
    ? pino_1.default.transport({
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname,service',
            messageFormat: '{msg}',
        },
    })
    : pino_1.default.destination({ sync: false }));
//# sourceMappingURL=logger.js.map