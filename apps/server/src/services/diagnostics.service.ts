import { Queue, Job } from 'bullmq';
import mongoose from 'mongoose';

import { getQueueConnection, getQueueName } from '../config/queue.config';
import { isRedisConnected } from '../config/redis';
import { getSocketTelemetry } from '../config/socket';
import { DeadLetterJob } from '../models/dead-letter-job.schema';
import { decryptPayload, isEncrypted } from '../utils/encryption';
import { logger } from '../utils/logger';
import { QueueService } from './queue.service';


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
    topologyType?: string;
    replicaSetName?: string;
    primaryHost?: string;
  };
  redis: {
    connected: boolean;
  };
  queues: QueueHealthStats[];
  dlq: {
    totalFailedCount: number;
  };
  sockets: {
    initialized: boolean;
    connectedClients: number;
    adminClients: number;
    emitsCount: Record<string, number>;
    emitFailures: Record<string, number>;
    skippedEmits: Record<string, number>;
  };
}

export class DiagnosticsService {
  private static readonly QUEUE_NAMES = ['booking-queue', 'pdf-queue', 'notification-queue', 'marketing-queue'];

  /**
   * Generates a complete system operational metrics and diagnostics report.
   */
  static async generateReport(): Promise<SystemDiagnosticsReport> {
    const redisActive = isRedisConnected();
    const queuesStats: QueueHealthStats[] = [];

    if (redisActive) {
      const connection = getQueueConnection();
      for (const name of this.QUEUE_NAMES.map(getQueueName)) {
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

    const socketTelemetry = getSocketTelemetry();

    const conn = mongoose.connection;
    let client: any = null;
    try {
      if (conn && conn.readyState === 1 && typeof conn.getClient === 'function') {
        client = conn.getClient();
      }
    } catch (e) {
      // Suppress connection extraction failures
    }
    const topology = client?.topology?.description;
    let primaryHost = 'Unknown';
    if (topology?.servers) {
      try {
        const servers = Array.from(topology.servers.values()) as any[];
        const primaryServer = servers.find((s) => s.type === 'RSPrimary');
        if (primaryServer) {
          primaryHost = primaryServer.address || 'Unknown';
        }
      } catch (e) {
        // Suppress parser errors
      }
    }

    return {
      timestamp: new Date().toISOString(),
      database: {
        state: conn.readyState === 1 ? 'connected' : 'disconnected',
        readyState: conn.readyState,
        connectionsCount: (conn as any).base?.connections?.length || 1,
        topologyType: topology?.type ?? 'Unknown',
        replicaSetName: topology?.setName ?? 'Unknown',
        primaryHost,
      },
      redis: {
        connected: redisActive,
      },
      queues: queuesStats,
      dlq: {
        totalFailedCount: dlqCount,
      },
      sockets: socketTelemetry,
    };
  }

  public static readonly MAX_DLQ_REPLAY_BATCH = 50;

  /**
   * DLQ Tooling: Retrieves a paginated, sorted, and filtered metadata list of Dead Letter Jobs.
   */
  static async listDeadLetterJobs(
    page: number = 1,
    limit: number = 20,
    queueName?: string,
    search?: string
  ): Promise<{ data: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const filter: any = {};

    if (queueName) {
      filter.queueName = queueName;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { jobId: searchRegex },
        { jobName: searchRegex },
      ];
    }

    const total = await DeadLetterJob.countDocuments(filter);
    const jobs = await DeadLetterJob.find(filter)
      .select('-data -stacktrace')
      .sort({ processedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return {
      data: jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
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
      let payload = dlqJob.data;
      if (isEncrypted(payload)) {
        const decrypted = decryptPayload(payload);
        payload = JSON.parse(decrypted);
      }

      await QueueService.enqueue(
        dlqJob.queueName,
        dlqJob.jobName,
        payload,
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
   * DLQ Tooling: Retries all logged failed jobs in the collection, subject to the safety limit.
   */
  static async retryAllDeadLetterJobs(): Promise<{ successCount: number; failedCount: number }> {
    const totalCount = await DeadLetterJob.countDocuments({});
    if (totalCount > this.MAX_DLQ_REPLAY_BATCH) {
      throw new Error('Too many DLQ jobs to replay at once');
    }

    const failedJobs = await DeadLetterJob.find({}).select('_id').limit(this.MAX_DLQ_REPLAY_BATCH).lean();
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
