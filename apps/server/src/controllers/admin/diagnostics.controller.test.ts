import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks must be registered BEFORE importing controller ───
vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'test_jwt_secret_with_32_characters_long_minimum',
    JWT_ADMIN_SECRET: 'test_admin_secret_with_32_characters_long_minimum',
    JWT_SESSION_SECRET: 'test_session_secret_with_32_characters_long_minimum',
  })),
}));

vi.mock('../../models/reservation.schema', () => ({
  Reservation: {
    find: vi.fn(),
  },
}));

vi.mock('../../services/queue.service', () => ({
  QueueService: {
    getQueueStatus: vi.fn(),
    pauseQueue: vi.fn(),
    resumeQueue: vi.fn(),
    drainQueue: vi.fn(),
  },
}));

vi.mock('../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

import { AppError } from '../../middleware/error.middleware';
import { QueueService } from '../../services/queue.service';
import { auditLog } from '../../utils/audit';
import { getQueuesStatus, pauseQueueHandler, resumeQueueHandler, drainQueueHandler } from './diagnostics.controller';

const mockRequest = (params = {}, body = {}, admin?: any) => {
  return {
    params,
    body,
    admin,
  } as any;
};

const mockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = () => vi.fn();

describe('Diagnostics Controller - Queue Controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getQueuesStatus', () => {
    it('should successfully retrieve status metrics for all whitelisted queues', async () => {
      const mockStatus = {
        name: 'booking-queue',
        isPaused: false,
        active: 0,
        waiting: 0,
        delayed: 0,
        failed: 0,
        completed: 0,
      };
      vi.mocked(QueueService.getQueueStatus).mockResolvedValue(mockStatus);

      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      await getQueuesStatus(req, res, next);

      expect(QueueService.getQueueStatus).toHaveBeenCalledTimes(4);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([mockStatus]),
        })
      );
    });

    it('should forward service errors to next', async () => {
      const error = new Error('Redis offline');
      vi.mocked(QueueService.getQueueStatus).mockRejectedValueOnce(error);

      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      await getQueuesStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('pauseQueueHandler', () => {
    it('should successfully pause a queue and write an audit log', async () => {
      const req = mockRequest(
        { name: 'booking-queue' },
        {},
        { sub: 'admin-123', email: 'admin@mad.com', role: 'super_admin' }
      );
      const res = mockResponse();
      const next = mockNext();

      await pauseQueueHandler(req, res, next);

      expect(QueueService.pauseQueue).toHaveBeenCalledWith('booking-queue');
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUEUE_PAUSED',
          actor: { type: 'admin', id: 'admin-123' },
          status: 'success',
          metadata: expect.objectContaining({
            queueName: 'booking-queue',
            role: 'super_admin',
          }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('resumeQueueHandler', () => {
    it('should successfully resume a queue and write an audit log', async () => {
      const req = mockRequest(
        { name: 'booking-queue' },
        {},
        { sub: 'admin-123', email: 'admin@mad.com', role: 'super_admin' }
      );
      const res = mockResponse();
      const next = mockNext();

      await resumeQueueHandler(req, res, next);

      expect(QueueService.resumeQueue).toHaveBeenCalledWith('booking-queue');
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUEUE_RESUMED',
          actor: { type: 'admin', id: 'admin-123' },
          status: 'success',
          metadata: expect.objectContaining({
            queueName: 'booking-queue',
            role: 'super_admin',
          }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('drainQueueHandler', () => {
    it('should successfully drain marketing-queue and write audit logs', async () => {
      const req = mockRequest(
        { name: 'marketing-queue' },
        {},
        { sub: 'admin-123', email: 'admin@mad.com', role: 'super_admin' }
      );
      const res = mockResponse();
      const next = mockNext();

      await drainQueueHandler(req, res, next);

      expect(QueueService.drainQueue).toHaveBeenCalledWith('marketing-queue');
      // Should log attempt
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUEUE_DRAIN_ATTEMPTED',
          status: 'pending',
        })
      );
      // Should log completion
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUEUE_DRAINED',
          status: 'success',
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should block draining booking-queue with 403 Forbidden and log failure', async () => {
      const req = mockRequest(
        { name: 'booking-queue' },
        {},
        { sub: 'admin-123', email: 'admin@mad.com', role: 'super_admin' }
      );
      const res = mockResponse();
      const next = mockNext();

      await drainQueueHandler(req, res, next);

      expect(QueueService.drainQueue).not.toHaveBeenCalled();
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUEUE_DRAIN_BLOCKED',
          status: 'failure',
          metadata: expect.objectContaining({
            queueName: 'booking-queue',
            reason: 'transactional_queue_drain_prohibited',
          }),
        })
      );
      expect(next).toHaveBeenCalledWith(
        expect.any(AppError)
      );
      const errorPassed = next.mock.calls[0][0];
      expect(errorPassed.statusCode).toBe(403);
      expect(errorPassed.message).toBe('Draining is prohibited on transactional queues');
    });

    it('should block draining pdf-queue with 403 Forbidden and log failure', async () => {
      const req = mockRequest(
        { name: 'pdf-queue' },
        {},
        { sub: 'admin-123', email: 'admin@mad.com', role: 'super_admin' }
      );
      const res = mockResponse();
      const next = mockNext();

      await drainQueueHandler(req, res, next);

      expect(QueueService.drainQueue).not.toHaveBeenCalled();
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUEUE_DRAIN_BLOCKED',
          status: 'failure',
        })
      );
      const errorPassed = next.mock.calls[0][0];
      expect(errorPassed.statusCode).toBe(403);
    });

    it('should block draining notification-queue with 403 Forbidden and log failure', async () => {
      const req = mockRequest(
        { name: 'notification-queue' },
        {},
        { sub: 'admin-123', email: 'admin@mad.com', role: 'super_admin' }
      );
      const res = mockResponse();
      const next = mockNext();

      await drainQueueHandler(req, res, next);

      expect(QueueService.drainQueue).not.toHaveBeenCalled();
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUEUE_DRAIN_BLOCKED',
          status: 'failure',
        })
      );
      const errorPassed = next.mock.calls[0][0];
      expect(errorPassed.statusCode).toBe(403);
    });
  });
});
