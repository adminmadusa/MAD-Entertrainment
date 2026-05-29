import { Queue, QueueOptions } from 'bullmq';
import { EventEmitter } from 'events';

import { getQueueConnection, getQueuePrefix } from '../config/queue.config';
import { isRedisConnected } from '../config/redis';
import { logger } from '../utils/logger';

// Local Event Emitter to serve as the local in-memory fallback queue when Redis is offline.
export const localFallbackEmitter = new EventEmitter();

// Limit EventEmitter listener warnings
localFallbackEmitter.setMaxListeners(100);

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

    // Local Degraded Fallback Execution
    logger.warn(
      { queueName, jobName, jobId },
      'Redis offline or queue failed. Processing job via local in-memory degraded fallback.'
    );

    // Run in-memory execution in the next tick of the event loop to ensure non-blocking dispatch
    process.nextTick(() => {
      localFallbackEmitter.emit(queueName, {
        name: jobName,
        data,
        id: jobId || `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        isFallback: true,
      });
    });
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
