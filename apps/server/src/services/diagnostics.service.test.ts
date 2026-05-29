import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

import { DiagnosticsService } from './diagnostics.service';
import { isRedisConnected } from '../config/redis';
import { DeadLetterJob } from '../models/dead-letter-job.schema';
import { QueueService } from './queue.service';

// Local toggle variables for strict state control
let redisConnectedState = true;

vi.mock('../config/redis', () => ({
  isRedisConnected: () => redisConnectedState,
}));

vi.mock('../config/queue.config', () => ({
  getQueueConnection: () => ({}),
  getQueueName: (name: string) => name,
}));

vi.mock('bullmq', () => {
  class MockQueue {
    name: string;
    options: any;

    getJobCounts = vi.fn().mockResolvedValue({
      active: 1,
      waiting: 2,
      delayed: 0,
      failed: 0,
      completed: 5,
    });

    getJobs = vi.fn().mockResolvedValue([{ timestamp: Date.now() - 5000 }]);
    close = vi.fn().mockResolvedValue(undefined);

    constructor(name: string, options: any) {
      this.name = name;
      this.options = options;
    }
  }

  return {
    Queue: MockQueue,
  };
});

vi.mock('../models/dead-letter-job.schema', () => ({
  DeadLetterJob: {
    countDocuments: vi.fn(),
    findById: vi.fn(),
    findByIdAndDelete: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('./queue.service', () => ({
  QueueService: {
    enqueue: vi.fn(),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Diagnostics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisConnectedState = true;
  });

  describe('generateReport', () => {
    it('should generate complete system diagnostic report when Redis is active', async () => {
      redisConnectedState = true;
      vi.mocked(DeadLetterJob.countDocuments).mockResolvedValue(4);

      const report = await DiagnosticsService.generateReport();

      expect(report).toBeDefined();
      expect(report.redis.connected).toBe(true);
      expect(report.dlq.totalFailedCount).toBe(4);
      expect(report.queues.length).toBe(3); // Handles 3 standard queues
      expect(report.queues[0].waiting).toBe(2);
      expect(report.queues[0].oldestWaitingJobAgeMs).toBeGreaterThan(0);
      expect(report.sockets).toBeDefined();
      expect(report.sockets.initialized).toBe(false);
      expect(report.sockets.connectedClients).toBe(0);
    });

    it('should return empty queues array and disconnected redis status if Redis is offline', async () => {
      redisConnectedState = false;
      vi.mocked(DeadLetterJob.countDocuments).mockResolvedValue(1);

      const report = await DiagnosticsService.generateReport();

      expect(report.redis.connected).toBe(false);
      expect(report.queues.length).toBe(0);
      expect(report.dlq.totalFailedCount).toBe(1);
    });
  });

  describe('retryDeadLetterJob', () => {
    it('should re-enqueue and delete DLQ job if it exists', async () => {
      const mockDlqId = new Types.ObjectId().toString();
      const mockDlqJob = {
        _id: mockDlqId,
        queueName: 'pdf-queue',
        jobName: 'pdf:generate',
        data: { bookingId: 'b-777' },
        jobId: 'pdf-777',
      };

      vi.mocked(DeadLetterJob.findById).mockResolvedValue(mockDlqJob as any);

      const res = await DiagnosticsService.retryDeadLetterJob(mockDlqId);

      expect(res).toBe(true);
      expect(QueueService.enqueue).toHaveBeenCalledWith(
        'pdf-queue',
        'pdf:generate',
        { bookingId: 'b-777' },
        'pdf-777'
      );
      expect(DeadLetterJob.findByIdAndDelete).toHaveBeenCalledWith(mockDlqId);
    });

    it('should return false if DLQ job is not found', async () => {
      vi.mocked(DeadLetterJob.findById).mockResolvedValue(null);

      const res = await DiagnosticsService.retryDeadLetterJob('fake-id');

      expect(res).toBe(false);
      expect(QueueService.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('retryAllDeadLetterJobs', () => {
    it('should bulk retry all logged dead letter jobs', async () => {
      const mockDlqId1 = new Types.ObjectId().toString();
      const mockDlqId2 = new Types.ObjectId().toString();

      const mockJobs = [
        { _id: mockDlqId1, queueName: 'a', jobName: 'j', data: {}, jobId: '1' },
        { _id: mockDlqId2, queueName: 'b', jobName: 'j', data: {}, jobId: '2' },
      ];

      vi.mocked(DeadLetterJob.find).mockReturnValue({
        limit: vi.fn().mockResolvedValue(mockJobs),
      } as any);

      vi.mocked(DeadLetterJob.findById)
        .mockResolvedValueOnce(mockJobs[0] as any)
        .mockResolvedValueOnce(mockJobs[1] as any);

      const stats = await DiagnosticsService.retryAllDeadLetterJobs();

      expect(stats.successCount).toBe(2);
      expect(stats.failedCount).toBe(0);
      expect(QueueService.enqueue).toHaveBeenCalledTimes(2);
    });
  });
});
