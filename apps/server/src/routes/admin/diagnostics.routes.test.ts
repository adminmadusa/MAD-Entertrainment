import { describe, expect, it, vi, beforeEach } from 'vitest';

// ─── Mocks must be registered BEFORE the router is imported ───
vi.mock('../../controllers/admin/diagnostics.controller', () => ({
  getConsistencyDiagnostics: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  repairConsistency: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  listReservations: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  getSystemDiagnostics: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  listDeadLetterJobs: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  getDeadLetterJob: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  retryFailedJob: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  retryAllFailedJobs: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  getQueuesStatus: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  pauseQueueHandler: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  resumeQueueHandler: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  drainQueueHandler: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
}));

vi.mock('../../middleware/auth.middleware', () => ({
  requireAdmin: vi.fn((req: any, res: any, next: any) => next()),
  requireSuperAdmin: vi.fn((req: any, res: any, next: any) => next()),
}));

vi.mock('../../middleware/rate.middleware', () => ({
  adminLimiter: vi.fn((req: any, res: any, next: any) => next()),
}));

vi.mock('../../middleware/validation.middleware', () => ({
  validateQuery: vi.fn(() => vi.fn((req: any, res: any, next: any) => next())),
  validateParams: vi.fn((schema) => vi.fn((req: any, res: any, next: any) => {
    if (schema && typeof schema.safeParse === 'function') {
      const result = schema.safeParse(req.params);
      if (!result.success) {
        const err: any = new Error('Validation failed');
        err.statusCode = 400;
        return next(err);
      }
      req.params = result.data;
    }
    next();
  })),
}));

vi.mock('../../validations/payment.validation', () => ({
  listReservationsQuerySchema: {},
  retryFailedJobParamSchema: {},
}));

vi.mock('../../validations/diagnostics.validation', () => ({
  listDlqQuerySchema: {},
}));

vi.mock('../../validations/queue.validation', () => ({
  queueNameParamSchema: {
    safeParse: vi.fn((params) => {
      if (params && params.name && ['booking-queue', 'pdf-queue', 'notification-queue', 'marketing-queue'].includes(params.name)) {
        return { success: true, data: params };
      }
      return {
        success: false,
        error: {
          issues: [{ path: ['name'], message: 'Validation failed' }],
        },
      };
    }),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// ─── Import AFTER mocks are registered ────────────────────────
import router from './diagnostics.routes';
import { requireAdmin, requireSuperAdmin } from '../../middleware/auth.middleware';
import { adminLimiter } from '../../middleware/rate.middleware';
import * as controller from '../../controllers/admin/diagnostics.controller';

// Helper to get handlers from route stack
function getHandlers(method: 'get' | 'post', path: string): any[] {
  const layer = router.stack.find(
    (item: any) => item.route?.path === path && item.route?.methods?.[method]
  );
  if (!layer) throw new Error(`Route ${method.toUpperCase()} ${path} not found in router stack`);
  return layer.route.stack.map((s: any) => s.handle);
}

// Helper to execute middleware chain
async function runChain(handlers: any[], req: any, res: any) {
  let index = 0;
  const next = async (err?: any) => {
    if (err) {
      req.error = err;
      return;
    }
    if (index < handlers.length) {
      const h = handlers[index++];
      await h(req, res, next);
    }
  };
  await next();
}

describe('diagnostics.routes.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /consistency', () => {
    it('requires SuperAdmin privileges', () => {
      const handlers = getHandlers('get', '/consistency');
      expect(handlers).toContain(requireSuperAdmin);
      expect(handlers).toContain(controller.getConsistencyDiagnostics);
    });
  });

  describe('POST /consistency/repair', () => {
    it('requires SuperAdmin privileges', () => {
      const handlers = getHandlers('post', '/consistency/repair');
      expect(handlers).toContain(requireSuperAdmin);
      expect(handlers).toContain(controller.repairConsistency);
    });
  });

  describe('GET /reservations', () => {
    it('requires SuperAdmin privileges', () => {
      const handlers = getHandlers('get', '/reservations');
      expect(handlers).toContain(requireSuperAdmin);
      expect(handlers).toContain(controller.listReservations);
    });
  });

  describe('GET /system', () => {
    it('requires requireSuperAdmin (SuperAdmin only)', () => {
      const handlers = getHandlers('get', '/system');
      expect(handlers).toContain(requireSuperAdmin);
      expect(handlers).toContain(controller.getSystemDiagnostics);
    });

    it('denies access for standard Admin/Unauthenticated (behavioral)', async () => {
      const handlers = getHandlers('get', '/system');
      vi.mocked(requireSuperAdmin).mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(403).json({ success: false, message: 'Super admin access required' });
      });
      const req: any = {};
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
      await runChain(handlers, req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(controller.getSystemDiagnostics).not.toHaveBeenCalled();
    });
  });

  describe('GET /dlq', () => {
    it('requires requireSuperAdmin (SuperAdmin only)', () => {
      const handlers = getHandlers('get', '/dlq');
      expect(handlers).toContain(requireSuperAdmin);
      expect(handlers).toContain(controller.listDeadLetterJobs);
    });

    it('denies access for standard Admin/Unauthenticated (behavioral)', async () => {
      const handlers = getHandlers('get', '/dlq');
      vi.mocked(requireSuperAdmin).mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(403).json({ success: false, message: 'Super admin access required' });
      });
      const req: any = {};
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
      await runChain(handlers, req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(controller.listDeadLetterJobs).not.toHaveBeenCalled();
    });
  });

  describe('GET /dlq/:id', () => {
    it('requires SuperAdmin, has adminLimiter', () => {
      const handlers = getHandlers('get', '/dlq/:id');
      expect(handlers).toContain(requireSuperAdmin);
      expect(handlers).toContain(adminLimiter);
      expect(handlers).toContain(controller.getDeadLetterJob);
    });
  });

  describe('POST /dlq/:id/retry', () => {
    it('requires SuperAdmin, has adminLimiter', () => {
      const handlers = getHandlers('post', '/dlq/:id/retry');
      expect(handlers).toContain(requireSuperAdmin);
      expect(handlers).toContain(adminLimiter);
      expect(handlers).toContain(controller.retryFailedJob);
    });
  });

  describe('POST /dlq/retry-all', () => {
    it('requires SuperAdmin, has adminLimiter', () => {
      const handlers = getHandlers('post', '/dlq/retry-all');
      expect(handlers).toContain(requireSuperAdmin);
      expect(handlers).toContain(adminLimiter);
      expect(handlers).toContain(controller.retryAllFailedJobs);
    });
  });

  describe('GET /queues', () => {
    it('requires requireSuperAdmin (SuperAdmin only)', () => {
      const handlers = getHandlers('get', '/queues');
      expect(handlers).toContain(requireSuperAdmin);
      expect(handlers[handlers.length - 1]).toBe(controller.getQueuesStatus);
    });

    it('denies access for standard Admin/Unauthenticated (behavioral)', async () => {
      const handlers = getHandlers('get', '/queues');
      vi.mocked(requireSuperAdmin).mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(403).json({ success: false, message: 'Super admin access required' });
      });
      const req: any = {};
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
      await runChain(handlers, req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(controller.getQueuesStatus).not.toHaveBeenCalled();
    });

    it('successfully calls getQueuesStatus controller', async () => {
      const handlers = getHandlers('get', '/queues');
      vi.mocked(requireSuperAdmin).mockImplementationOnce((req: any, res: any, next: any) => next());
      const req: any = {};
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
      await runChain(handlers, req, res);
      expect(controller.getQueuesStatus).toHaveBeenCalled();
    });
  });

  describe('POST /queues/:name/pause', () => {
    it('has requireSuperAdmin in the chain', () => {
      const handlers = getHandlers('post', '/queues/:name/pause');
      expect(handlers).toContain(requireSuperAdmin);
    });

    it('validates queue name and passes for whitelisted names', async () => {
      const handlers = getHandlers('post', '/queues/:name/pause');
      const req: any = { params: { name: 'booking-queue' } };
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
      await runChain(handlers, req, res);
      expect(req.error).toBeUndefined();
      expect(controller.pauseQueueHandler).toHaveBeenCalled();
    });

    it('rejects with 400 bad request for non-whitelisted queue name', async () => {
      const handlers = getHandlers('post', '/queues/:name/pause');
      const req: any = { params: { name: 'fake-queue' } };
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
      await runChain(handlers, req, res);
      expect(req.error).toBeDefined();
      expect(req.error.statusCode).toBe(400);
      expect(req.error.message).toContain('Validation failed');
      expect(controller.pauseQueueHandler).not.toHaveBeenCalled();
    });
  });

  describe('POST /queues/:name/resume', () => {
    it('has requireSuperAdmin in the chain', () => {
      const handlers = getHandlers('post', '/queues/:name/resume');
      expect(handlers).toContain(requireSuperAdmin);
    });

    it('validates queue name and passes for whitelisted names', async () => {
      const handlers = getHandlers('post', '/queues/:name/resume');
      const req: any = { params: { name: 'marketing-queue' } };
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
      await runChain(handlers, req, res);
      expect(req.error).toBeUndefined();
      expect(controller.resumeQueueHandler).toHaveBeenCalled();
    });
  });

  describe('POST /queues/:name/drain', () => {
    it('has requireSuperAdmin in the chain', () => {
      const handlers = getHandlers('post', '/queues/:name/drain');
      expect(handlers).toContain(requireSuperAdmin);
    });

    it('validates queue name and passes for whitelisted names', async () => {
      const handlers = getHandlers('post', '/queues/:name/drain');
      const req: any = { params: { name: 'marketing-queue' } };
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
      await runChain(handlers, req, res);
      expect(req.error).toBeUndefined();
      expect(controller.drainQueueHandler).toHaveBeenCalled();
    });
  });
});
