"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
class CacheService {
    static PREFIX = 'mad:cache:';
    static getFullKey(key) {
        return `${this.PREFIX}${key}`;
    }
    /**
     * Fetch a value from the cache. Returns null if missing or if Redis is disconnected/errored.
     */
    static async get(key) {
        if (!(0, redis_1.isRedisConnected)())
            return null;
        try {
            const redis = (0, redis_1.getRedis)();
            const fullKey = this.getFullKey(key);
            const data = await redis.get(fullKey);
            if (!data)
                return null;
            return JSON.parse(data);
        }
        catch (err) {
            logger_1.logger.error({ err, key }, 'CacheService.get failed');
            return null;
        }
    }
    /**
     * Save a value in the cache with an optional TTL (in seconds).
     */
    static async set(key, value, ttlSeconds = 300) {
        if (!(0, redis_1.isRedisConnected)())
            return;
        try {
            const redis = (0, redis_1.getRedis)();
            const fullKey = this.getFullKey(key);
            const serialized = JSON.stringify(value);
            if (ttlSeconds > 0) {
                await redis.set(fullKey, serialized, 'EX', ttlSeconds);
            }
            else {
                await redis.set(fullKey, serialized);
            }
        }
        catch (err) {
            logger_1.logger.error({ err, key }, 'CacheService.set failed');
        }
    }
    /**
     * Delete a specific key from the cache.
     */
    static async del(key) {
        if (!(0, redis_1.isRedisConnected)())
            return;
        try {
            const redis = (0, redis_1.getRedis)();
            const fullKey = this.getFullKey(key);
            await redis.del(fullKey);
        }
        catch (err) {
            logger_1.logger.error({ err, key }, 'CacheService.del failed');
        }
    }
    /**
     * Delete keys matching a glob pattern (e.g. "events:*").
     */
    static async delPattern(pattern) {
        if (!(0, redis_1.isRedisConnected)())
            return;
        try {
            const redis = (0, redis_1.getRedis)();
            const fullPattern = this.getFullKey(pattern);
            let cursor = '0';
            do {
                const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', fullPattern, 'COUNT', 250);
                cursor = nextCursor;
                if (keys.length > 0) {
                    await redis.del(...keys);
                }
            } while (cursor !== '0');
        }
        catch (err) {
            logger_1.logger.error({ err, pattern }, 'CacheService.delPattern failed');
        }
    }
}
exports.CacheService = CacheService;
//# sourceMappingURL=cache.service.js.map