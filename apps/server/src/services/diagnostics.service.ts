import { Queue, Job } from 'bullmq';
import mongoose from 'mongoose';

import { getQueueConnection } from '../config/queue.config';
import { isRedisConnected } from '../config/redis';
import { DeadLetterJob } from '../models/dead-letter-job.schema';
import { QueueService } from './queue.service';
import { logger } from '../utils/logger';

export interface QueueHealthStats {
  name: string;
  active: number;
  waiting: number;
  delayed: number;
  failed: number;
  completed: number;
  oldestWaitingJobAgeMs: number;
}

export interface SystemDiagnosticsReport {
  timestamp: string;
  database: {
    state: string;
    readyState: number;
    connectionsCount: number;
  };
  redis: {
    connected: boolean;
  };
  queues: QueueHealthStats[];
  dlq: {
    totalFailedCount: number;
  };
}

export class DiagnosticsService {
  private static readonly QUEUE_NAMES = ['booking-queue', 'pdf-queue', 'notification-queue'];

  /**
   * Generates a complete system operational metrics and diagnostics report.
   */
  static async generateReport(): Promise<SystemDiagnosticsReport> {
    const redisActive = isRedisConnected();
    const queuesStats: QueueHealthStats[] = [];

    if (redisActive) {
      const connection = getQueueConnection();
      for (const name of this.QUEUE_NAMES) {
        try {
          const queue = new Queue(name, { connection, skipVersionCheck: true });
          const [counts, waitingJobs] = await Promise.all([
            queue.getJobCounts('active', 'waiting', 'delayed', 'failed', 'completed'),
            queue.getJobs(['waiting'], 0, 1, true),
          ]);

          let oldestWaitingJobAgeMs = 0;
          if (waitingJobs.length > 0 && waitingJobs[0]?.timestamp) {
            oldestWaitingJobAgeMs = Date.now() - waitingJobs[0].timestamp;
          }

          queuesStats.push({
            name,
            active: counts.active,
            waiting: counts.waiting,
            delayed: counts.delayed,
            failed: counts.failed,
            completed: counts.completed,
            oldestWaitingJobAgeMs,
          });

          await queue.close();
        } catch (err) {
          logger.error({ err, queue: name }, 'Diagnostics failed to retrieve queue stats');
          queuesStats.push({
            name,
            active: 0,
            waiting: 0,
            delayed: 0,
            failed: 0,
            completed: 0,
            oldestWaitingJobAgeMs: 0,
          });
        }
      }
    }

    const dlqCount = await DeadLetterJob.countDocuments({});

    return {
      timestamp: new Date().toISOString(),
      database: {
        state: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        readyState: mongoose.connection.readyState,
        connectionsCount: (mongoose.connection as any).base?.connections?.length || 1,
      },
      redis: {
        connected: redisActive,
      },
      queues: queuesStats,
      dlq: {
        totalFailedCount: dlqCount,
      },
    };
  }

  /**
   * DLQ Tooling: Retries a specific Dead Letter Job by re-enqueuing it and deleting the DLQ record.
   */
  static async retryDeadLetterJob(dlqId: string): Promise<boolean> {
    const dlqJob = await DeadLetterJob.findById(dlqId);
    if (!dlqJob) {
      logger.warn({ dlqId }, 'DeadLetterJob not found for retry execution');
      return false;
    }

    try {
      await QueueService.enqueue(
        dlqJob.queueName,
        dlqJob.jobName,
        dlqJob.data,
        dlqJob.jobId
      );

      // Clean up from DLQ list upon successful re-enqueue
      await DeadLetterJob.findByIdAndDelete(dlqId);
      logger.info({ dlqId, queue: dlqJob.queueName, jobId: dlqJob.jobId }, 'Dead letter job re-enqueued and clean up complete.');
      return true;
    } catch (err) {
      logger.error({ err, dlqId }, 'Failed to re-enqueue Dead Letter Job');
      return false;
    }
  }

  /**
   * DLQ Tooling: Retries all logged failed jobs in the collection.
   */
  static async retryAllDeadLetterJobs(): Promise<{ successCount: number; failedCount: number }> {
    const failedJobs = await DeadLetterJob.find({}).limit(500);
    let successCount = 0;
    let failedCount = 0;

    for (const job of failedJobs) {
      const res = await this.retryDeadLetterJob(job._id.toString());
      if (res) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    return { successCount, failedCount };
  }
}
