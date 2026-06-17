import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueueService } from './queue.service';
import { isRedisConnected } from '../config/redis';

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
