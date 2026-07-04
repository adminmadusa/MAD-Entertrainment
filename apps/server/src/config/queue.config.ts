import { ConnectionOptions } from 'bullmq';
import { getEnv } from './env';
import { logger } from '../utils/logger';

export function getQueueName(baseName: string): string {
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'local';
  return `${baseName}-${appEnv}`;
}

export function getQueueConnection(): ConnectionOptions {
  const url = getEnv().REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL is required for BullMQ queues but was not configured');
  }

  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      maxRetriesPerRequest: null, // Strictly required by BullMQ to prevent connection blocks
      // Suppress the per-connection "Eviction policy is volatile-lru" console.warn.
      // BullMQ issues a Redis INFO command on every RedisConnection init and warns
      // when maxmemory_policy !== 'noeviction'. With 3 Workers + up to 3 Queues this
      // fires 6 times. skipVersionCheck disables that INFO call entirely. The correct
      // long-term fix is setting maxmemory-policy noeviction on the Redis server.
      skipVersionCheck: true,
    };
  } catch (err) {
    logger.error({ err, url }, 'Failed to parse REDIS_URL for Queue connection');
    throw new Error('Invalid REDIS_URL configuration for queue integration');
  }
}

export function getQueuePrefix(): string {
  const env = getEnv();
  if (env.NODE_ENV === 'development') {
    const devIdentifier = process.env.USER || 'local';
    return `bull:dev:${devIdentifier}`;
  }
  return `bull:${env.NODE_ENV}`;
}
