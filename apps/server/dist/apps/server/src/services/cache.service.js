"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
class CacheService {
    /**
     * Get parsed JSON value from cache
     */
    static async get(key) {
        try {
            const redis = (0, redis_1.getRedis)();
            const val = await redis.get(key);
            if (!val)
                return null;
            return JSON.parse(val);
        }
        catch (err) {
            logger_1.logger.error({ err, key }, 'CacheService: Failed to get key');
            return null;
        }
    }
    /**
     * Set cache value with TTL in seconds
     */
    static async set(key, value, ttlSeconds) {
        try {
            const redis = (0, redis_1.getRedis)();
            const stringified = JSON.stringify(value);
            await redis.set(key, stringified, 'EX', ttlSeconds);
        }
        catch (err) {
            logger_1.logger.error({ err, key }, 'CacheService: Failed to set key');
        }
    }
    /**
     * Delete specific cache key
     */
    static async del(key) {
        try {
            const redis = (0, redis_1.getRedis)();
            await redis.del(key);
        }
        catch (err) {
            logger_1.logger.error({ err, key }, 'CacheService: Failed to delete key');
        }
    }
    /**
     * Delete keys matching pattern using non-blocking SCAN
     */
    static async delPattern(pattern) {
        try {
            const redis = (0, redis_1.getRedis)();
            let cursor = '0';
            do {
                const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = nextCursor;
                if (keys.length > 0) {
                    await redis.del(...keys);
                }
            } while (cursor !== '0');
        }
        catch (err) {
            logger_1.logger.error({ err, pattern }, 'CacheService: Failed to delete pattern');
        }
    }
}
exports.CacheService = CacheService;
//# sourceMappingURL=cache.service.js.map