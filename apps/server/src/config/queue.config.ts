import { ConnectionOptions } from 'bullmq';
import { getEnv } from './env';
import { logger } from '../utils/logger';

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
    };
  } catch (err) {
    logger.error({ err, url }, 'Failed to parse REDIS_URL for Queue connection');
    throw new Error('Invalid REDIS_URL configuration for queue integration');
  }
}
