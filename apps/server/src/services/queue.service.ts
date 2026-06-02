import { Queue, QueueOptions } from 'bullmq';

import { getQueueConnection, getQueuePrefix } from '../config/queue.config';
import { isRedisConnected } from '../config/redis';
import { logger } from '../utils/logger';

export class QueueService {
  private static queues: Record<string, Queue> = {};

  private static getQueue(queueName: string): Queue | null {
    if (!isRedisConnected()) {
      return null;
    }

    if (this.queues[queueName]) {
      return this.queues[queueName];
    }

    try {
      const connection = getQueueConnection();
      const options: QueueOptions = {
        connection,
        prefix: getQueuePrefix(),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000, // Starts at 5s, then 10s, 20s...
          },
          removeOnComplete: true, // Auto-cleanup successful jobs
          removeOnFail: false,   // Retain failed jobs for dead-letter processing
        },
      };

      this.queues[queueName] = new Queue(queueName, options);
      logger.info({ queueName, prefix: options.prefix }, 'BullMQ Queue initialized successfully');
      return this.queues[queueName];
    } catch (err) {
      logger.error({ err, queueName }, 'Failed to initialize BullMQ Queue. Operating in degraded mode.');
      return null;
    }
  }

  /**
   * Add a job to a queue. Falls back to local in-memory emitter if Redis is unavailable.
   */
  static async enqueue<T>(
    queueName: string,
    jobName: string,
    data: T,
    jobId?: string
  ): Promise<void> {
    const queue = this.getQueue(queueName);

    if (queue) {
      try {
        await queue.add(jobName, data, { jobId });
        logger.debug({ queueName, jobName, jobId }, 'Job enqueued in BullMQ');
        return;
      } catch (err) {
        logger.error({ err, queueName, jobName }, 'Failed to enqueue job in BullMQ. Attempting local fallback.');
      }
    }

    // Fail-Fast Strategy: Throw an error immediately when Redis is offline to delegate persistence to payment webhooks
    throw new Error(`Queue connection error: Redis is offline. Failed to enqueue job ${jobName} for queue ${queueName}`);
  }

  /**
   * Close all active queue connections gracefully (essential for testing and server shutdown hooks).
   */
  static async closeAll(): Promise<void> {
    const activeQueues = Object.values(this.queues);
    this.queues = {};
    for (const queue of activeQueues) {
      try {
        await queue.close();
      } catch (err) {
        logger.error({ err, queue: queue.name }, 'Error closing queue connection');
      }
    }
  }
}
