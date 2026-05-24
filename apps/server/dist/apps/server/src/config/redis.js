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
let redisClient;
function getRedis() {
    if (redisClient)
        return redisClient;
    const url = (0, env_1.getEnv)().REDIS_URL;
    if (!url) {
        throw new Error('REDIS_URL is required before Redis-backed operations can run');
    }
    redisClient = new ioredis_1.default(url, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            if (times > 10)
                return null;
            return Math.min(times * 200, 2000);
        },
    });
    redisClient.on('ready', () => logger_1.logger.info('Redis ready'));
    redisClient.on('error', (err) => logger_1.logger.error({ err }, 'Redis error'));
    redisClient.on('close', () => logger_1.logger.warn('Redis connection closed'));
    return redisClient;
}
async function waitForRedisReady() {
    const client = getRedis();
    if (client.status === 'ready')
        return;
    await new Promise((resolve, reject) => {
        const cleanup = () => {
            client.off('ready', onReady);
            client.off('error', onError);
        };
        const onReady = () => {
            cleanup();
            resolve();
        };
        const onError = (err) => {
            cleanup();
            reject(err);
        };
        client.once('ready', onReady);
        client.once('error', onError);
    });
}
async function disconnectRedis() {
    if (!redisClient)
        return;
    await redisClient.quit();
    redisClient = undefined;
}
function isRedisConnected() {
    return redisClient?.status === 'ready';
}
//# sourceMappingURL=redis.js.map