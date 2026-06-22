import { describe, expect, it, vi, beforeEach } from 'vitest';

// ─── Register Mocks BEFORE Importing Router ───
vi.mock('../../controllers/admin/diagnostics.controller', () => ({
  getConsistencyDiagnostics: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  listReservations: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  repairConsistency: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  getSystemDiagnostics: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  listDeadLetterJobs: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  getDeadLetterJob: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  retryFailedJob: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  retryAllFailedJobs: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
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
  validateParams: vi.fn(() => vi.fn((req: any, res: any, next: any) => next())),
}));

vi.mock('../../validations/payment.validation', () => ({
  listReservationsQuerySchema: {},
  retryFailedJobParamSchema: {},
}));

vi.mock('../../validations/diagnostics.validation', () => ({
  listDlqQuerySchema: {},
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// ─── Import AFTER Mocks Are Set ───
import router from './diagnostics.routes';
import { requireAdmin, requireSuperAdmin } from '../../middleware/auth.middleware';
import { adminLimiter } from '../../middleware/rate.middleware';
import {
  getConsistencyDiagnostics,
  listReservations,
  repairConsistency,
  getSystemDiagnostics,
  listDeadLetterJobs,
  getDeadLetterJob,
  retryFailedJob,
  retryAllFailedJobs,
} from '../../controllers/admin/diagnostics.controller';

// ─── Helpers ───
function getHandlers(method: 'get' | 'post', path: string): any[] {
  const layer = router.stack.find(
    (item: any) => item.route?.path === path && item.route?.methods?.[method]
  );
  if (!layer) throw new Error(`Route ${method.toUpperCase()} ${path} not found in diagnostics router stack`);
  return layer.route.stack.map((s: any) => s.handle);
}

describe('Diagnostics admin routes validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /consistency', () => {
    it('requires SuperAdmin privileges', () => {
      const handlers = getHandlers('get', '/consistency');
      expect(handlers).toContain(requireSuperAdmin);
      expect(handlers).toContain(getConsistencyDiagnostics);
    });
  });

  describe('POST /consistency/repair', () => {
    it('requires SuperAdmin privileges', () => {
      const handlers = getHandlers('post', '/consistency/repair');
      expect(handlers).toContain(requireSuperAdmin);
      expect(handlers).toContain(repairConsistency);
    });
  });

  describe('GET /system', () => {
    it('does NOT require requireSuperAdmin (accessible to standard Admin)', () => {
      const handlers = getHandlers('get', '/system');
      expect(handlers).not.toContain(requireSuperAdmin);
      expect(handlers).toContain(getSystemDiagnostics);
    });
  });

  describe('GET /dlq', () => {
    it('is registered and does NOT require requireSuperAdmin', () => {
      const handlers = getHandlers('get', '/dlq');
      expect(handlers).not.toContain(requireSuperAdmin);
      expect(handlers).toContain(listDeadLetterJobs);
    });
  });

  describe('GET /dlq/:id', () => {
    it('requires SuperAdmin, has adminLimiter', () => {
      const handlers = getHandlers('get', '/dlq/:id');
      expect(handlers).toContain(requireSuperAdmin);
      expect(handlers).toContain(adminLimiter);
      expect(handlers).toContain(getDeadLetterJob);
    });
  });

  describe('POST /dlq/:id/retry', () => {
    it('requires SuperAdmin, has adminLimiter', () => {
      const handlers = getHandlers('post', '/dlq/:id/retry');
      expect(handlers).toContain(requireSuperAdmin);
      expect(handlers).toContain(adminLimiter);
      expect(handlers).toContain(retryFailedJob);
    });
  });

  describe('POST /dlq/retry-all', () => {
    it('requires SuperAdmin, has adminLimiter', () => {
      const handlers = getHandlers('post', '/dlq/retry-all');
      expect(handlers).toContain(requireSuperAdmin);
      expect(handlers).toContain(adminLimiter);
      expect(handlers).toContain(retryAllFailedJobs);
    });
  });
});
