import rateLimit, { MemoryStore, Store } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

import { getEnv } from '../config/env';
import { getRedis, isRedisConnected } from '../config/redis';
import { logger } from '../utils/logger';

const env = () => getEnv();

class ResilientRedisStore implements Store {
  private redisStore?: RedisStore;
  private memoryStore: MemoryStore;

  constructor(prefix: string) {
    this.memoryStore = new MemoryStore();
    try {
      this.redisStore = new RedisStore({
        sendCommand: async (...args: string[]) => {
          if (!isRedisConnected()) {
            throw new Error('Redis not connected');
          }
          const client = getRedis();
          return client.call(args[0], ...args.slice(1)) as Promise<any>;
        },
        prefix: `mad:limiter:${prefix}:`,
      });
    } catch (err) {
      logger.error({ err }, `Failed to initialize RedisStore for limiter ${prefix}`);
    }
  }

  init(options: any) {
    if (this.redisStore && typeof this.redisStore.init === 'function') {
      const initPromise = this.redisStore.init(options);
      if (initPromise && typeof initPromise.catch === 'function') {
        initPromise.catch((err: any) => {
          logger.debug({ err }, 'Redis rate limit store initialization deferred');
        });
      }

      // Prevent unhandled promise rejections if Redis is not connected during startup
      if (this.redisStore.incrementScriptSha && typeof this.redisStore.incrementScriptSha.catch === 'function') {
        this.redisStore.incrementScriptSha.catch(() => {});
      }
      if (this.redisStore.getScriptSha && typeof this.redisStore.getScriptSha.catch === 'function') {
        this.redisStore.getScriptSha.catch(() => {});
      }
    }
    if (typeof this.memoryStore.init === 'function') {
      this.memoryStore.init(options);
    }
  }

  async increment(key: string) {
    if (isRedisConnected() && this.redisStore) {
      try {
        return await this.redisStore.increment(key);
      } catch (err) {
        logger.error({ err, key }, 'Redis rate limit store increment failed, falling back to memory');
        return await this.memoryStore.increment(key);
      }
    }
    return this.memoryStore.increment(key);
  }

  async decrement(key: string) {
    if (isRedisConnected() && this.redisStore) {
      try {
        await this.redisStore.decrement(key);
        return;
      } catch (err) {
        logger.error({ err, key }, 'Redis rate limit store decrement failed, falling back to memory');
      }
    }
    await this.memoryStore.decrement(key);
  }

  async resetKey(key: string) {
    if (isRedisConnected() && this.redisStore) {
      try {
        await this.redisStore.resetKey(key);
        return;
      } catch (err) {
        logger.error({ err, key }, 'Redis rate limit store resetKey failed, falling back to memory');
      }
    }
    await this.memoryStore.resetKey(key);
  }
}

export const generalLimiter = rateLimit({
  windowMs: env().RATE_LIMIT_WINDOW_MS,
  limit: env().RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: new ResilientRedisStore('general'),
});

export const authLimiter = rateLimit({
  windowMs: env().RATE_LIMIT_WINDOW_MS,
  limit: env().RATE_LIMIT_AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: new ResilientRedisStore('auth'),
});

export const paymentLimiter = rateLimit({
  windowMs: env().RATE_LIMIT_WINDOW_MS,
  limit: env().RATE_LIMIT_PAYMENT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: new ResilientRedisStore('payment'),
});

