import mongoose, { Types } from 'mongoose';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { isRedisConnected } from '../config/redis';
import { DeadLetterJob } from '../models/dead-letter-job.schema';
import { DiagnosticsService } from './diagnostics.service';
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
  let originalReadyState: number;

  beforeEach(() => {
    vi.clearAllMocks();
    redisConnectedState = true;
    originalReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', {
      get: () => 1,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(mongoose.connection, 'readyState', {
      get: () => originalReadyState,
      configurable: true,
    });
  });

  describe('generateReport', () => {
    it('should generate complete system diagnostic report when Redis is active', async () => {
      redisConnectedState = true;
      vi.mocked(DeadLetterJob.countDocuments).mockResolvedValue(4);

      const report = await DiagnosticsService.generateReport();

      expect(report).toBeDefined();
      expect(report.redis.connected).toBe(true);
      expect(report.dlq.totalFailedCount).toBe(4);
      expect(report.queues.length).toBe(4); // Handles 4 standard queues
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

    it('should safely populate database HA topology metadata properties with defaults', async () => {
      // Mock mongoose readyState to disconnected state
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', {
        get: () => 0,
        configurable: true,
      });

      const report = await DiagnosticsService.generateReport();

      expect(report.database).toBeDefined();
      expect(report.database.state).toBe('disconnected');
      expect(report.database.topologyType).toBe('Unknown');
      expect(report.database.replicaSetName).toBe('Unknown');
      expect(report.database.primaryHost).toBe('Unknown');
      expect(report.database.members).toEqual([]);

      // Restore original readyState
      Object.defineProperty(mongoose.connection, 'readyState', {
        get: () => originalReadyState,
        configurable: true,
      });
    });

    it('should correctly populate and sort replica set members from MongoDB topology description', async () => {
      const originalGetClient = mongoose.connection.getClient;
      const mockServers = new Map([
        ['host2:27017', { address: 'host2:27017', type: 'RSSecondary' }],
        ['host1:27017', { address: 'host1:27017', type: 'RSPrimary' }],
      ]);
      const mockClient = {
        topology: {
          description: {
            type: 'ReplicaSetWithPrimary',
            setName: 'rs0',
            servers: mockServers,
          },
        },
      };

      mongoose.connection.getClient = vi.fn().mockReturnValue(mockClient);

      const report = await DiagnosticsService.generateReport();

      expect(report.database.topologyType).toBe('ReplicaSetWithPrimary');
      expect(report.database.replicaSetName).toBe('rs0');
      expect(report.database.primaryHost).toBe('host1:27017');
      // Assert sorted order by address
      expect(report.database.members).toEqual([
        { address: 'host1:27017', type: 'RSPrimary' },
        { address: 'host2:27017', type: 'RSSecondary' },
      ]);

      mongoose.connection.getClient = originalGetClient;
    });

    it('should handle undefined topology in client safely', async () => {
      const originalGetClient = mongoose.connection.getClient;
      const mockClient = {
        topology: undefined,
      };

      mongoose.connection.getClient = vi.fn().mockReturnValue(mockClient);

      const report = await DiagnosticsService.generateReport();

      expect(report.database.topologyType).toBe('Unknown');
      expect(report.database.replicaSetName).toBe('Unknown');
      expect(report.database.primaryHost).toBe('Unknown');
      expect(report.database.members).toEqual([]);

      mongoose.connection.getClient = originalGetClient;
    });

    it('should handle empty servers map in topology safely', async () => {
      const originalGetClient = mongoose.connection.getClient;
      const mockClient = {
        topology: {
          description: {
            type: 'ReplicaSetNoPrimary',
            setName: 'rs0',
            servers: new Map(),
          },
        },
      };

      mongoose.connection.getClient = vi.fn().mockReturnValue(mockClient);

      const report = await DiagnosticsService.generateReport();

      expect(report.database.topologyType).toBe('ReplicaSetNoPrimary');
      expect(report.database.replicaSetName).toBe('rs0');
      expect(report.database.primaryHost).toBe('Unknown');
      expect(report.database.members).toEqual([]);

      mongoose.connection.getClient = originalGetClient;
    });

    it('should fallback primaryHost to Unknown if no primary server is present', async () => {
      const originalGetClient = mongoose.connection.getClient;
      const mockServers = new Map([
        ['host1:27017', { address: 'host1:27017', type: 'RSSecondary' }],
        ['host2:27017', { address: 'host2:27017', type: 'RSSecondary' }],
      ]);
      const mockClient = {
        topology: {
          description: {
            type: 'ReplicaSetNoPrimary',
            setName: 'rs0',
            servers: mockServers,
          },
        },
      };

      mongoose.connection.getClient = vi.fn().mockReturnValue(mockClient);

      const report = await DiagnosticsService.generateReport();

      expect(report.database.primaryHost).toBe('Unknown');
      expect(report.database.members).toEqual([
        { address: 'host1:27017', type: 'RSSecondary' },
        { address: 'host2:27017', type: 'RSSecondary' },
      ]);

      mongoose.connection.getClient = originalGetClient;
    });

    it('should use fallback values if server metadata is malformed', async () => {
      const originalGetClient = mongoose.connection.getClient;
      const mockServers = new Map([
        ['host1:27017', { address: undefined, type: undefined }],
      ]);
      const mockClient = {
        topology: {
          description: {
            type: 'ReplicaSetNoPrimary',
            setName: 'rs0',
            servers: mockServers,
          },
        },
      };

      mongoose.connection.getClient = vi.fn().mockReturnValue(mockClient);

      const report = await DiagnosticsService.generateReport();

      expect(report.database.members).toEqual([
        { address: 'Unknown', type: 'Unknown' },
      ]);

      mongoose.connection.getClient = originalGetClient;
    });
  });

  describe('listDeadLetterJobs', () => {
    it('should query and return paginated metadata for DLQ jobs', async () => {
      const mockJobs = [
        { _id: 'job1', queueName: 'booking-queue', jobId: 'j1', jobName: 'booking:confirm', attemptsMade: 3, failedReason: 'Error', processedAt: new Date() },
      ];

      vi.mocked(DeadLetterJob.countDocuments).mockResolvedValue(1);

      const selectMock = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(mockJobs)
            })
          })
        })
      });

      vi.mocked(DeadLetterJob.find).mockReturnValue({
        select: selectMock
      } as any);

      const result = await DiagnosticsService.listDeadLetterJobs(1, 10, 'booking-queue', 'j1');

      expect(result.data).toEqual(mockJobs);
      expect(result.pagination.total).toBe(1);
      expect(selectMock).toHaveBeenCalledWith('-data -stacktrace');
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
    it('should bulk retry failed jobs if total count is within limits', async () => {
      const mockDlqId1 = new Types.ObjectId().toString();
      const mockDlqId2 = new Types.ObjectId().toString();

      const mockJobs = [
        { _id: mockDlqId1, queueName: 'a', jobName: 'j', data: {}, jobId: '1' },
        { _id: mockDlqId2, queueName: 'b', jobName: 'j', data: {}, jobId: '2' },
      ];

      vi.mocked(DeadLetterJob.countDocuments).mockResolvedValue(2);

      const selectMock = vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockJobs)
        })
      });
      vi.mocked(DeadLetterJob.find).mockReturnValue({
        select: selectMock
      } as any);

      vi.mocked(DeadLetterJob.findById)
        .mockResolvedValueOnce(mockJobs[0] as any)
        .mockResolvedValueOnce(mockJobs[1] as any);

      const stats = await DiagnosticsService.retryAllDeadLetterJobs();

      expect(stats.successCount).toBe(2);
      expect(stats.failedCount).toBe(0);
      expect(QueueService.enqueue).toHaveBeenCalledTimes(2);
    });

    it('should reject bulk retry if total count exceeds the safety limit', async () => {
      vi.mocked(DeadLetterJob.countDocuments).mockResolvedValue(51);

      await expect(DiagnosticsService.retryAllDeadLetterJobs()).rejects.toThrow(
        'Too many DLQ jobs to replay at once'
      );
    });
  });
});
