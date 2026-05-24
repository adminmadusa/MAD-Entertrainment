"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentLimiter = exports.authLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const env_1 = require("../config/env");
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
const env = () => (0, env_1.getEnv)();
class ResilientRedisStore {
    redisStore;
    memoryStore;
    constructor(prefix) {
        this.memoryStore = new express_rate_limit_1.MemoryStore();
        try {
            this.redisStore = new rate_limit_redis_1.default({
                sendCommand: async (...args) => {
                    if (!(0, redis_1.isRedisConnected)()) {
                        throw new Error('Redis not connected');
                    }
                    const client = (0, redis_1.getRedis)();
                    return client.call(args[0], ...args.slice(1));
                },
                prefix: `mad:limiter:${prefix}:`,
            });
        }
        catch (err) {
            logger_1.logger.error({ err }, `Failed to initialize RedisStore for limiter ${prefix}`);
        }
    }
    init(options) {
        if (this.redisStore && typeof this.redisStore.init === 'function') {
            const initPromise = this.redisStore.init(options);
            if (initPromise && typeof initPromise.catch === 'function') {
                initPromise.catch((err) => {
                    logger_1.logger.debug({ err }, 'Redis rate limit store initialization deferred');
                });
            }
            // Prevent unhandled promise rejections if Redis is not connected during startup
            if (this.redisStore.incrementScriptSha && typeof this.redisStore.incrementScriptSha.catch === 'function') {
                this.redisStore.incrementScriptSha.catch(() => { });
            }
            if (this.redisStore.getScriptSha && typeof this.redisStore.getScriptSha.catch === 'function') {
                this.redisStore.getScriptSha.catch(() => { });
            }
        }
        if (typeof this.memoryStore.init === 'function') {
            this.memoryStore.init(options);
        }
    }
    async increment(key) {
        if ((0, redis_1.isRedisConnected)() && this.redisStore) {
            try {
                return await this.redisStore.increment(key);
            }
            catch (err) {
                logger_1.logger.error({ err, key }, 'Redis rate limit store increment failed, falling back to memory');
                return await this.memoryStore.increment(key);
            }
        }
        return this.memoryStore.increment(key);
    }
    async decrement(key) {
        if ((0, redis_1.isRedisConnected)() && this.redisStore) {
            try {
                await this.redisStore.decrement(key);
                return;
            }
            catch (err) {
                logger_1.logger.error({ err, key }, 'Redis rate limit store decrement failed, falling back to memory');
            }
        }
        await this.memoryStore.decrement(key);
    }
    async resetKey(key) {
        if ((0, redis_1.isRedisConnected)() && this.redisStore) {
            try {
                await this.redisStore.resetKey(key);
                return;
            }
            catch (err) {
                logger_1.logger.error({ err, key }, 'Redis rate limit store resetKey failed, falling back to memory');
            }
        }
        await this.memoryStore.resetKey(key);
    }
}
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: env().RATE_LIMIT_WINDOW_MS,
    limit: env().RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    store: new ResilientRedisStore('general'),
});
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: env().RATE_LIMIT_WINDOW_MS,
    limit: env().RATE_LIMIT_AUTH_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    store: new ResilientRedisStore('auth'),
});
exports.paymentLimiter = (0, express_rate_limit_1.default)({
    windowMs: env().RATE_LIMIT_WINDOW_MS,
    limit: env().RATE_LIMIT_PAYMENT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    store: new ResilientRedisStore('payment'),
});
//# sourceMappingURL=rate.middleware.js.map