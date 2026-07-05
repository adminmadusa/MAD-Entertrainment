import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { isRedisConnected } from '../config/redis';
import { AppError } from '../middleware/error.middleware';
import { QueueService } from './queue.service';

// Local state toggles to control mock behavior dynamically across tests
let redisConnectedState = true;
let queueShouldThrow = false;
let lastQueueInstance: any = null;

vi.mock('../config/redis', () => ({
  isRedisConnected: () => redisConnectedState,
  getRedis: () => ({}),
}));

vi.mock('../config/queue.config', () => ({
  getQueueConnection: () => ({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null,
  }),
  getQueuePrefix: () => 'bull:test',
  getQueueName: (name: string) => name,
}));

vi.mock('bullmq', () => {
  class MockQueue {
    name: string;
    options: any;
    add = vi.fn().mockImplementation(async (jobName, data, opts) => {
      if (queueShouldThrow) {
        throw new Error('Redis connection lost');
      }
      return { id: 'job-mock-id' };
    });
    close = vi.fn().mockResolvedValue(undefined);
    pause = vi.fn().mockImplementation(async () => {
      if (queueShouldThrow) {
        throw new Error('Redis connection lost');
      }
      return undefined;
    });
    resume = vi.fn().mockImplementation(async () => {
      if (queueShouldThrow) {
        throw new Error('Redis connection lost');
      }
      return undefined;
    });
    drain = vi.fn().mockImplementation(async () => {
      if (queueShouldThrow) {
        throw new Error('Redis connection lost');
      }
      return undefined;
    });
    isPaused = vi.fn().mockImplementation(async () => {
      if (queueShouldThrow) {
        throw new Error('Redis connection lost');
      }
      return false;
    });
    getJobCounts = vi.fn().mockImplementation(async (...types) => {
      if (queueShouldThrow) {
        throw new Error('Redis connection lost');
      }
      return { active: 1, waiting: 2, delayed: 3, failed: 4, completed: 5 };
    });

    constructor(name: string, options: any) {
      this.name = name;
      this.options = options;
      lastQueueInstance = this;
    }
  }

  return {
    Queue: MockQueue,
  };
});

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Queue Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisConnectedState = true;
    queueShouldThrow = false;
    lastQueueInstance = null;
    // Reset private queues state in QueueService
    (QueueService as any).queues = {};
  });

  afterEach(async () => {
    await QueueService.closeAll();
  });

  describe('enqueue', () => {
    it('should successfully add a job to BullMQ if Redis is active', async () => {
      redisConnectedState = true;

      const payload = { bookingId: 'b-999', amount: 100 };
      await QueueService.enqueue('booking-queue', 'booking:confirm', payload, 'custom-id');

      expect(lastQueueInstance).toBeDefined();
      expect(lastQueueInstance.name).toBe('booking-queue');
      expect(lastQueueInstance.add).toHaveBeenCalledWith('booking:confirm', payload, { jobId: 'custom-id' });
    });

    it('should throw an error immediately if Redis is disconnected (Fail-Fast)', async () => {
      redisConnectedState = false;

      const payload = { bookingId: 'b-111' };

      await expect(
        QueueService.enqueue('booking-queue', 'booking:confirm', payload, 'lock-id')
      ).rejects.toThrow('Queue connection error: Redis is offline');

      expect(lastQueueInstance).toBeNull();
    });

    it('should throw the original error if BullMQ enqueue fails while Redis is active', async () => {
      redisConnectedState = true;
      queueShouldThrow = true;

      const payload = { email: 'test@example.com' };

      await expect(
        QueueService.enqueue('notification-queue', 'email:send', payload, 'email-id')
      ).rejects.toThrow('Redis connection lost');
    });

    it('should throw Redis offline error if BullMQ enqueue fails and Redis goes offline mid-flight', async () => {
      // Enqueue a dummy job to initialize lastQueueInstance
      redisConnectedState = true;
      queueShouldThrow = false;
      await QueueService.enqueue('notification-queue', 'email:send', {});

      queueShouldThrow = true;

      // Simulate Redis going offline during add()
      vi.spyOn(lastQueueInstance, 'add').mockImplementationOnce(async () => {
        redisConnectedState = false; // Redis goes offline mid-flight
        throw new Error('Redis connection lost');
      });

      const payload = { email: 'test@example.com' };

      await expect(
        QueueService.enqueue('notification-queue', 'email:send', payload, 'email-id')
      ).rejects.toThrow('Queue connection error: Redis is offline');
    });
  });

  describe('pauseQueue', () => {
    it('should successfully pause a queue when Redis is active', async () => {
      redisConnectedState = true;
      await QueueService.pauseQueue('marketing-queue');
      expect(lastQueueInstance).toBeDefined();
      expect(lastQueueInstance.pause).toHaveBeenCalledTimes(1);
    });

    it('should throw error when Redis is offline', async () => {
      redisConnectedState = false;
      await expect(QueueService.pauseQueue('marketing-queue')).rejects.toThrow(
        'Queue unavailable: Redis is offline. Cannot pause queue marketing-queue'
      );
    });
  });

  describe('resumeQueue', () => {
    it('should successfully resume a queue when Redis is active', async () => {
      redisConnectedState = true;
      await QueueService.resumeQueue('marketing-queue');
      expect(lastQueueInstance).toBeDefined();
      expect(lastQueueInstance.resume).toHaveBeenCalledTimes(1);
    });

    it('should throw error when Redis is offline', async () => {
      redisConnectedState = false;
      await expect(QueueService.resumeQueue('marketing-queue')).rejects.toThrow(
        'Queue unavailable: Redis is offline. Cannot resume queue marketing-queue'
      );
    });
  });

  describe('drainQueue', () => {
    it('should successfully drain marketing-queue when Redis is active', async () => {
      redisConnectedState = true;
      await QueueService.drainQueue('marketing-queue');
      expect(lastQueueInstance).toBeDefined();
      expect(lastQueueInstance.drain).toHaveBeenCalledTimes(1);
    });

    it('should throw forbidden AppError if draining transactional queues (e.g. booking-queue)', async () => {
      redisConnectedState = true;
      await expect(QueueService.drainQueue('booking-queue')).rejects.toThrow(
        'Draining is prohibited on transactional queues'
      );
    });

    it('should throw error when Redis is offline', async () => {
      redisConnectedState = false;
      // Draining non-marketing queue fails first on the hard block
      await expect(QueueService.drainQueue('booking-queue')).rejects.toThrow(
        'Draining is prohibited on transactional queues'
      );
      // Draining marketing queue fails on Redis offline check
      await expect(QueueService.drainQueue('marketing-queue')).rejects.toThrow(
        'Queue unavailable: Redis is offline. Cannot drain queue marketing-queue'
      );
    });
  });

  describe('getQueueStatus', () => {
    it('should return correct queue status metrics when Redis is active', async () => {
      redisConnectedState = true;
      const status = await QueueService.getQueueStatus('marketing-queue');
      expect(status).toEqual({
        name: 'marketing-queue',
        isPaused: false,
        active: 1,
        waiting: 2,
        delayed: 3,
        failed: 4,
        completed: 5,
      });
    });

    it('should throw error when Redis is offline', async () => {
      redisConnectedState = false;
      await expect(QueueService.getQueueStatus('marketing-queue')).rejects.toThrow(
        'Queue unavailable: Redis is offline. Cannot get status for queue marketing-queue'
      );
    });
  });

  describe('closeAll', () => {
    it('should close all active BullMQ queue connections', async () => {
      redisConnectedState = true;

      // Enqueue to initialize queues
      await QueueService.enqueue('queue-a', 'job', {});
      const queueA = lastQueueInstance;

      await QueueService.enqueue('queue-b', 'job', {});
      const queueB = lastQueueInstance;

      expect(queueA).not.toBe(queueB);

      await QueueService.closeAll();
      expect(queueA.close).toHaveBeenCalledTimes(1);
      expect(queueB.close).toHaveBeenCalledTimes(1);
    });
  });
});
