import Redis from 'ioredis';

import { logger } from '../utils/logger';
import { getEnv } from './env';

let redisClient: Redis | undefined;

export function getRedis(): Redis {
  if (redisClient) return redisClient;

  const url = getEnv().REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL is required before Redis-backed operations can run');
  }

  redisClient = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 200, 2000);
    },
  });

  redisClient.on('ready', () => logger.info('Redis ready'));
  redisClient.on('error', (err) => logger.error({ err }, 'Redis error'));
  redisClient.on('close', () => logger.warn('Redis connection closed'));

  return redisClient;
}

export async function waitForRedisReady(): Promise<void> {
  const client = getRedis();
  if (client.status === 'ready') return;

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      client.off('ready', onReady);
      client.off('error', onError);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    client.once('ready', onReady);
    client.once('error', onError);
  });
}

export async function disconnectRedis(): Promise<void> {
  if (!redisClient) return;
  await redisClient.quit();
  redisClient = undefined;
}

export function isRedisConnected(): boolean {
  return redisClient?.status === 'ready';
}

export const COMPARE_AND_DELETE_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

/**
 * Atomically releases a Redis distributed lock only if the current value matches the expected owner.
 * Executes a single atomic Lua script to prevent race conditions where a lock expires and is acquired
 * by a replacement owner before deletion.
 *
 * @param redis The active Redis client instance
 * @param key The lock key (e.g., `mad:lock:event:...:seat:...`)
 * @param owner The ownership token (e.g., sessionId)
 * @returns Promise<boolean> true if lock was deleted; false if owner mismatched, key expired, or key absent
 */
export async function releaseLockAtomic(
  redis: Redis,
  key: string,
  owner: string
): Promise<boolean> {
  const result = await redis.eval(COMPARE_AND_DELETE_LUA, 1, key, owner);
  return result === 1;
}

/**
 * Atomically releases a batch of Redis distributed locks for a given owner.
 * Iterates through the keys and atomically releases each key held by the specified owner.
 *
 * @param redis The active Redis client instance
 * @param keys Array of lock keys
 * @param owner The ownership token
 * @returns Promise<string[]> Array of keys successfully released
 */
export async function releaseLocksAtomic(
  redis: Redis,
  keys: string[],
  owner: string
): Promise<string[]> {
  const released: string[] = [];
  for (const key of keys) {
    const ok = await releaseLockAtomic(redis, key, owner);
    if (ok) {
      released.push(key);
    }
  }
  return released;
}

