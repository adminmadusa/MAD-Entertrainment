"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const env_1 = require("../config/env");
const env = (0, env_1.getEnv)();
const isDev = env.NODE_ENV !== 'production';
exports.logger = (0, pino_1.default)({
    level: env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
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
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname,service',
            messageFormat: '{msg}',
        },
    })
    : pino_1.default.destination({ sync: false }));
//# sourceMappingURL=logger.js.map