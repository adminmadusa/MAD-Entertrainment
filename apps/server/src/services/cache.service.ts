import { getRedis, isRedisConnected } from '../config/redis';
import { logger } from '../utils/logger';

export class CacheService {
  private static readonly PREFIX = 'mad:cache:';

  private static getFullKey(key: string): string {
    return `${this.PREFIX}${key}`;
  }

  /**
   * Fetch a value from the cache. Returns null if missing or if Redis is disconnected/errored.
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!isRedisConnected()) return null;

    try {
      const redis = getRedis();
      const fullKey = this.getFullKey(key);
      const data = await redis.get(fullKey);
      if (!data) return null;

      return JSON.parse(data) as T;
    } catch (err) {
      logger.error({ err, key }, 'CacheService.get failed');
      return null;
    }
  }

  /**
   * Save a value in the cache with an optional TTL (in seconds).
   */
  static async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    if (!isRedisConnected()) return;

    try {
      const redis = getRedis();
      const fullKey = this.getFullKey(key);
      const serialized = JSON.stringify(value);

      if (ttlSeconds > 0) {
        await redis.set(fullKey, serialized, 'EX', ttlSeconds);
      } else {
        await redis.set(fullKey, serialized);
      }
    } catch (err) {
      logger.error({ err, key }, 'CacheService.set failed');
    }
  }

  /**
   * Delete a specific key from the cache.
   */
  static async del(key: string): Promise<void> {
    if (!isRedisConnected()) return;

    try {
      const redis = getRedis();
      const fullKey = this.getFullKey(key);
      await redis.del(fullKey);
    } catch (err) {
      logger.error({ err, key }, 'CacheService.del failed');
    }
  }

  /**
   * Delete keys matching a glob pattern (e.g. "events:*").
   */
  static async delPattern(pattern: string): Promise<void> {
    if (!isRedisConnected()) return;

    try {
      const redis = getRedis();
      const fullPattern = this.getFullKey(pattern);
      
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', fullPattern, 'COUNT', 250);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      logger.error({ err, pattern }, 'CacheService.delPattern failed');
    }
  }
}
