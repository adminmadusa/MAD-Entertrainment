import { Queue, QueueOptions } from 'bullmq';

import { getQueueConnection, getQueuePrefix, getQueueName } from '../config/queue.config';
import { isRedisConnected } from '../config/redis';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

export interface QueueControlStatus {
  name: string;
  isPaused: boolean;
  active: number;
  waiting: number;
  delayed: number;
  failed: number;
  completed: number;
}

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

    if (!queue) {
      throw new Error(
        `Queue connection error: Redis is offline. Failed to enqueue job ${jobName} for queue ${queueName}`
      );
    }

    try {
      await queue.add(jobName, data, { jobId });
      logger.debug({ queueName, jobName, jobId }, 'Job enqueued in BullMQ');
      return;
    } catch (err) {
      logger.error(
        { err, queueName, jobName },
        'Failed to enqueue job in BullMQ.'
      );

      if (!isRedisConnected()) {
        throw new Error(
          `Queue connection error: Redis is offline. Failed to enqueue job ${jobName} for queue ${queueName}`
        );
      }

      throw err;
    }
  }

  /**
   * Pause a queue by base name. Workers stop consuming jobs; existing jobs remain safely in queue.
   * Resolves to the env-qualified name (e.g. booking-queue-production) before operating.
   */
  static async pauseQueue(baseName: string): Promise<void> {
    const resolved = getQueueName(baseName);
    const queue = this.getQueue(resolved);
    if (!queue) {
      throw new Error(`Queue unavailable: Redis is offline. Cannot pause queue ${baseName}`);
    }
    await queue.pause();
    logger.info({ queueName: baseName }, 'BullMQ Queue paused successfully');
  }

  /**
   * Resume a paused queue by base name. Workers resume consuming jobs immediately.
   */
  static async resumeQueue(baseName: string): Promise<void> {
    const resolved = getQueueName(baseName);
    const queue = this.getQueue(resolved);
    if (!queue) {
      throw new Error(`Queue unavailable: Redis is offline. Cannot resume queue ${baseName}`);
    }
    await queue.resume();
    logger.info({ queueName: baseName }, 'BullMQ Queue resumed successfully');
  }

  /**
   * Drain a queue by base name — removes all waiting and delayed jobs.
   * DESTRUCTIVE. Enforces hard backend block: only 'marketing-queue' is allowed to be drained.
   */
  static async drainQueue(queueName: string): Promise<void> {
    if (queueName !== 'marketing-queue') {
      throw AppError.forbidden(
        'Draining is prohibited on transactional queues'
      );
    }
    const resolved = getQueueName(queueName);
    const queue = this.getQueue(resolved);
    if (!queue) {
      throw new Error(`Queue unavailable: Redis is offline. Cannot drain queue ${queueName}`);
    }
    await queue.drain();
    logger.info({ queueName }, 'BullMQ Queue drained successfully');
  }

  /**
   * Return live status metrics for a single queue by base name.
   */
  static async getQueueStatus(baseName: string): Promise<QueueControlStatus> {
    const resolved = getQueueName(baseName);
    const queue = this.getQueue(resolved);
    if (!queue) {
      throw new Error(`Queue unavailable: Redis is offline. Cannot get status for queue ${baseName}`);
    }
    const [counts, isPaused] = await Promise.all([
      queue.getJobCounts('active', 'waiting', 'delayed', 'failed', 'completed'),
      queue.isPaused(),
    ]);
    return {
      name: baseName,
      isPaused,
      active: counts.active ?? 0,
      waiting: counts.waiting ?? 0,
      delayed: counts.delayed ?? 0,
      failed: counts.failed ?? 0,
      completed: counts.completed ?? 0,
    };
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
