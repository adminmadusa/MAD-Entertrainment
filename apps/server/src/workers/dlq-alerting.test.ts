import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/node';
import { DeadLetterJob } from '../models/dead-letter-job.schema';
import { logger } from '../utils/logger';

vi.mock('bullmq', () => {
  const mockFailedListeners: Record<string, Function> = {};

  class MockWorker {
    name: string;
    constructor(name: string, processor: any, options: any) {
      this.name = name;
    }
    on(event: string, callback: Function) {
      if (event === 'failed') {
        mockFailedListeners[this.name] = callback;
      }
      return this;
    }
  }

  // Share registration registry via global context to bypass module hoisting limitations
  (globalThis as any).mockFailedListeners = mockFailedListeners;

  return {
    Worker: MockWorker,
    Queue: class {},
  };
});

// Import workers AFTER vi.mock('bullmq') is set up
import { startBookingWorker } from './booking.worker';
import { startPDFWorker } from './pdf.worker';
import { startEmailWorker } from './email.worker';

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
  startSpan: vi.fn((_spanInfo, callback) => callback()),
}));

vi.mock('../config/redis', () => ({
  isRedisConnected: () => true,
}));

vi.mock('../config/queue.config', () => ({
  getQueueConnection: () => ({}),
  getQueueName: (name: string) => name,
  getQueuePrefix: () => 'mad-test',
}));

vi.mock('../config/env', () => ({
  getEnv: () => ({
    NODE_ENV: 'test',
    APP_ENV: 'test',
  }),
}));

vi.mock('../models/dead-letter-job.schema', () => ({
  DeadLetterJob: {
    create: vi.fn(),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DLQ Failure and Alerting Flow', () => {
  let mockFailedListeners: Record<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Initialize workers to register their listeners
    startBookingWorker();
    startPDFWorker();
    startEmailWorker();
    mockFailedListeners = (globalThis as any).mockFailedListeners;
  });

  describe('Transient Failures (Attempts < Max)', () => {
    it('should not persist to MongoDB or alert Sentry if booking job failed but attempts remain', async () => {
      const failedHandler = mockFailedListeners['booking-queue'];
      expect(failedHandler).toBeDefined();

      const mockJob = {
        id: 'job-1',
        name: 'booking:confirm',
        data: { bookingId: 'booking-123' },
        attemptsMade: 1,
        opts: { attempts: 3 },
        stacktrace: ['Error line 1'],
      };
      const mockError = new Error('Transient Database Timeout');

      await failedHandler(mockJob, mockError);

      expect(DeadLetterJob.create).not.toHaveBeenCalled();
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });

  describe('Exhausted Failures (Attempts >= Max)', () => {
    it('should persist to MongoDB, write structured log, and notify Sentry for booking-queue', async () => {
      const failedHandler = mockFailedListeners['booking-queue'];
      const mockJob = {
        id: 'job-1',
        name: 'booking:confirm',
        data: { bookingId: 'booking-123' },
        attemptsMade: 3,
        opts: { attempts: 3 },
        stacktrace: ['Error line 1'],
      };
      const mockError = new Error('Permanent database crash');

      await failedHandler(mockJob, mockError);

      // 1. DLQ Persistence verified
      expect(DeadLetterJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          queueName: 'booking-queue',
          jobId: 'job-1',
          jobName: 'booking:confirm',
          failedReason: 'Permanent database crash',
          attemptsMade: 3,
        })
      );

      // 2. Structured logging verified
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-1',
          bookingId: 'booking-123',
          queueName: 'booking-queue',
          dlqStatus: 'exhausted',
        }),
        expect.any(String)
      );

      // 3. Sentry notification verified
      expect(Sentry.captureException).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          tags: expect.objectContaining({
            queue: 'booking-queue',
            severity: 'error',
          }),
          extra: expect.objectContaining({
            attemptsMade: 3,
            bookingId: 'booking-123',
          }),
        })
      );
    });

    it('should notify Sentry with warning severity for pdf-queue', async () => {
      const failedHandler = mockFailedListeners['pdf-queue'];
      const mockJob = {
        id: 'job-2',
        name: 'pdf:generate',
        data: { bookingId: 'booking-456', eventId: 'event-789' },
        attemptsMade: 3,
        opts: { attempts: 3 },
        stacktrace: [],
      };
      const mockError = new Error('PDF conversion error');

      await failedHandler(mockJob, mockError);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          tags: expect.objectContaining({
            queue: 'pdf-queue',
            severity: 'warning',
          }),
        })
      );
    });

    it('should notify Sentry with warning severity for notification-queue', async () => {
      const failedHandler = mockFailedListeners['notification-queue'];
      const mockJob = {
        id: 'job-3',
        name: 'email:dispatch',
        data: { bookingId: 'booking-456', eventId: 'event-789' },
        attemptsMade: 5,
        opts: { attempts: 5 },
        stacktrace: [],
      };
      const mockError = new Error('SMTP credentials rejected');

      await failedHandler(mockJob, mockError);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          tags: expect.objectContaining({
            queue: 'notification-queue',
            severity: 'warning',
          }),
        })
      );
    });
  });

  describe('Alert Grouping & Fingerprinting', () => {
    it('should generate identical fingerprints for duplicate failures on same queue and message', async () => {
      const failedHandler = mockFailedListeners['booking-queue'];
      
      const mockJob1 = {
        id: 'job-1',
        name: 'booking:confirm',
        data: { bookingId: 'booking-123' },
        attemptsMade: 3,
        opts: { attempts: 3 },
        stacktrace: [],
      };
      const mockJob2 = {
        id: 'job-2',
        name: 'booking:confirm',
        data: { bookingId: 'booking-456' },
        attemptsMade: 3,
        opts: { attempts: 3 },
        stacktrace: [],
      };
      const mockError1 = new Error('Database connection reset');
      const mockError2 = new Error('Database connection reset');

      await failedHandler(mockJob1, mockError1);
      await failedHandler(mockJob2, mockError2);

      expect(Sentry.captureException).toHaveBeenCalledTimes(2);
      const call1 = vi.mocked(Sentry.captureException).mock.calls[0];
      const call2 = vi.mocked(Sentry.captureException).mock.calls[1];

      expect(call1[1]?.fingerprint).toEqual(['dlq-failure', 'booking-queue', 'Database connection reset']);
      expect(call2[1]?.fingerprint).toEqual(['dlq-failure', 'booking-queue', 'Database connection reset']);
    });
  });

  describe('Observability Resilience (Sentry Failure Isolation)', () => {
    it('should handle Sentry throw, log the error, and allow failedHandler to complete cleanly', async () => {
      const failedHandler = mockFailedListeners['booking-queue'];
      const mockJob = {
        id: 'job-1',
        name: 'booking:confirm',
        data: { bookingId: 'booking-123' },
        attemptsMade: 3,
        opts: { attempts: 3 },
        stacktrace: [],
      };
      const mockError = new Error('Original booking failure');

      // Mock Sentry to throw an error
      vi.mocked(Sentry.captureException).mockImplementationOnce(() => {
        throw new Error('Sentry SDK transport error');
      });

      // Execute and ensure it does not throw
      await expect(failedHandler(mockJob, mockError)).resolves.not.toThrow();

      // Durability verification
      expect(DeadLetterJob.create).toHaveBeenCalled();
      
      // Resiliency verification
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.any(Error),
          originalErr: 'Original booking failure',
          jobId: 'job-1',
        }),
        'Failed to emit exception to Sentry'
      );
    });
  });
});
