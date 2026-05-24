"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedis = getRedis;
exports.waitForRedisReady = waitForRedisReady;
exports.disconnectRedis = disconnectRedis;
exports.isRedisConnected = isRedisConnected;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
const env_1 = require("./env");
let redisClient = null;
function getRedis() {
    if (!redisClient) {
        const env = (0, env_1.getEnv)();
        const url = env.REDIS_URL;
        redisClient = new ioredis_1.default(url, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                if (times > 10) {
                    logger_1.logger.error('Redis: max retries exceeded, giving up');
                    return null; // stop retrying
                }
                const delay = Math.min(times * 200, 2000);
                logger_1.logger.warn({ attempt: times, delay }, 'Redis: retrying connection...');
                return delay;
            },
            reconnectOnError(err) {
                logger_1.logger.warn({ err: err.message }, 'Redis: reconnecting after error');
                return true;
            },
            enableReadyCheck: true,
            lazyConnect: false,
        });
        redisClient.on('connect', () => logger_1.logger.info('✅ Redis connected'));
        redisClient.on('ready', () => logger_1.logger.info('✅ Redis ready'));
        redisClient.on('error', (err) => logger_1.logger.error({ err }, '❌ Redis error'));
        redisClient.on('close', () => logger_1.logger.warn('⚠️  Redis connection closed'));
        redisClient.on('reconnecting', () => logger_1.logger.info('🔄 Redis reconnecting...'));
    }
    return redisClient;
}
async function waitForRedisReady() {
    const client = getRedis();
    if (client.status === 'ready') {
        return;
    }
    return new Promise((resolve, reject) => {
        const onReady = () => {
            cleanup();
            resolve();
        };
        const onError = (err) => {
            cleanup();
            reject(err);
        };
        const onClose = () => {
            cleanup();
            reject(new Error('Redis connection closed during initialization'));
        };
        const cleanup = () => {
            client.off('ready', onReady);
            client.off('error', onError);
            client.off('close', onClose);
        };
        client.once('ready', onReady);
        client.once('error', onError);
        client.once('close', onClose);
    });
}
async function disconnectRedis() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        logger_1.logger.info('Redis connection closed');
    }
}
function isRedisConnected() {
    return redisClient?.status === 'ready';
}
//# sourceMappingURL=redis.js.map