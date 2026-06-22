import { AdminRole } from '@mad/shared';
import { describe, expect, it, vi } from 'vitest';
import { verifyAdminToken } from '../../utils/jwt';
import { requireAdmin, requireSuperAdmin, requireRole } from '../../middleware/auth.middleware';

vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../utils/jwt', () => ({
  verifyAdminToken: vi.fn(),
  extractBearerToken: vi.fn((header?: string) => header?.replace('Bearer ', '')),
}));

vi.mock('../../models/admin.schema', () => ({
  AdminModel: {
    findById: vi.fn(),
  },
}));

vi.mock('../../controllers/admin/diagnostics.controller', () => ({
  getConsistencyDiagnostics: vi.fn(),
  listReservations: vi.fn(),
  repairConsistency: vi.fn(),
  getSystemDiagnostics: vi.fn(),
  retryFailedJob: vi.fn(),
  retryAllFailedJobs: vi.fn(),
<<<<<<< HEAD
  getQueuesStatus: vi.fn(),
  pauseQueueHandler: vi.fn(),
  resumeQueueHandler: vi.fn(),
  drainQueueHandler: vi.fn(),
=======
  listDeadLetterJobs: vi.fn(),
  getDeadLetterJob: vi.fn(),
>>>>>>> develop
}));

vi.mock('../../controllers/admin/refund.controller', () => ({
  createRefund: vi.fn(),
  getRefunds: vi.fn(),
  processRefund: vi.fn(),
}));

vi.mock('../../controllers/admin/booking.controller', () => ({
  getBookings: vi.fn(),
  getBookingsSummary: vi.fn(),
  getBookingById: vi.fn(),
  cancelBooking: vi.fn(),
  correctBookingEmail: vi.fn(),
  resendBookingTickets: vi.fn(),
}));

vi.mock('../../controllers/admin/coupon.controller', () => ({
  createCoupon: vi.fn(),
  getCoupons: vi.fn(),
  getCouponById: vi.fn(),
  updateCoupon: vi.fn(),
  deleteCoupon: vi.fn(),
  toggleCoupon: vi.fn(),
}));

vi.mock('../../controllers/admin/category.controller', () => ({
  createCategory: vi.fn(),
  getCategories: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

vi.mock('../../controllers/admin/tier.controller', () => ({
  createTier: vi.fn(),
  getTiers: vi.fn(),
  updateTier: vi.fn(),
  deleteTier: vi.fn(),
}));

vi.mock('../../controllers/admin/popup.controller', () => ({
  createPopup: vi.fn(),
  getPopups: vi.fn(),
  getPopupById: vi.fn(),
  updatePopup: vi.fn(),
  deletePopup: vi.fn(),
  togglePopup: vi.fn(),
}));

vi.mock('../../controllers/admin/dj-operator.controller', () => ({
  createDJOperator: vi.fn(),
  getDJOperators: vi.fn(),
  getDJOperatorById: vi.fn(),
  updateDJOperator: vi.fn(),
  deleteDJOperator: vi.fn(),
}));

vi.mock('../../controllers/admin/analytics.controller', () => ({
  getSummary: vi.fn(),
  getRevenue: vi.fn(),
  getAttendanceSummary: vi.fn(),
  getAttendanceRankings: vi.fn(),
}));

vi.mock('../../controllers/admin/notification.controller', () => ({
  getNotifications: vi.fn(),
  retryNotification: vi.fn(),
}));

vi.mock('../../controllers/admin/webhook.controller', () => ({
  getWebhooks: vi.fn(),
}));

import bookingRoutes from './booking.routes';
import diagnosticsRoutes from './diagnostics.routes';
import refundRoutes from './refund.routes';
import couponRoutes from './coupon.routes';
import categoryRoutes from './category.routes';
import tierRoutes from './tier.routes';
import popupRoutes from './popup.routes';
import djOperatorRoutes from './dj-operator.routes';
import analyticsRoutes from './analytics.routes';
import notificationRoutes from './notification.routes';
import webhookRoutes from './webhook.routes';

type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';

function mockResponse() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function getRouterAuthMiddleware(router: any) {
  return router.stack[0].handle;
}

function getRouteMiddleware(router: any, path: string, method: Method) {
  const layer = router.stack.find((item: any) => {
    return item.route?.path === path && item.route?.methods?.[method];
  });

  if (!layer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  // Filter out Zod validations if present in route stack to test authorization guard directly
  const handlers = layer.route.stack.map((s: any) => s.handle);
  // Find requireRole or requireSuperAdmin
  const guard = handlers.find(
    (h: any) =>
      // Reference equality — most reliable: covers routes where adminLimiter precedes requireSuperAdmin
      h === requireSuperAdmin ||
      h === requireAdmin ||
      h.name === 'requireSuperAdmin' ||
      h.name === 'requireAdmin' ||
      (h.toString().includes('roles') && h.toString().includes('req.admin')) ||
      // Anonymous function returned by requireRole — must reference req.admin to exclude rate limiters
      (h.length === 3 && !h.toString().includes('validate') && h.toString().includes('req.admin'))
  );

  if (!guard) {
    throw new Error(`Authorization guard not found on ${method.toUpperCase()} ${path}`);
  }

  return guard;
}

function expectAllowed(middleware: any, role: AdminRole) {
  const req = { admin: { sub: `${role}-id`, email: `${role}@example.com`, role } };
  const res = mockResponse();
  const next = vi.fn();

  middleware(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
  expect(res.status).not.toHaveBeenCalled();
  expect(res.json).not.toHaveBeenCalled();
}

function expectDenied(middleware: any, role: AdminRole, message: string) {
  const req = { admin: { sub: `${role}-id`, email: `${role}@example.com`, role } };
  const res = mockResponse();
  const next = vi.fn();

  middleware(req, res, next);

  expect(next).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith({
    success: false,
    message,
  });
}

describe('admin operational RBAC routes', () => {
  it.each([
    ['diagnostics', diagnosticsRoutes],
    ['refunds', refundRoutes],
    ['bookings', bookingRoutes],
    ['coupons', couponRoutes],
    ['categories', categoryRoutes],
    ['tiers', tierRoutes],
    ['popups', popupRoutes],
    ['dj-operators', djOperatorRoutes],
    ['analytics', analyticsRoutes],
    ['notifications', notificationRoutes],
    ['webhooks', webhookRoutes],
  ])('requires admin authentication for %s router', (_name, router) => {
    const middleware = getRouterAuthMiddleware(router);
    const req = { headers: {} };
    const res = mockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Admin authentication required',
    });
  });

  // GET /system is intentionally accessible to all authenticated admins (not SuperAdmin-only).
  // Its Admin-level access is verified in diagnostics.routes.test.ts.
  it.each([
    ['/consistency', 'get'],
    ['/reservations', 'get'],
    ['/consistency/repair', 'post'],
    ['/dlq/:id/retry', 'post'],
    ['/dlq/retry-all', 'post'],
    ['/queues/:name/pause', 'post'],
    ['/queues/:name/resume', 'post'],
    ['/queues/:name/drain', 'post'],
  ] as Array<[string, Method]>)('allows only SUPER_ADMIN for diagnostics %s %s', (path, method) => {
    const middleware = getRouteMiddleware(diagnosticsRoutes, path, method);

    expectAllowed(middleware, AdminRole.SUPER_ADMIN);
    for (const role of [AdminRole.ADMIN, AdminRole.SUPPORT, AdminRole.MANAGER, AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Super admin access required');
    }
  });

  it.each([
    ['/', 'post'],
    ['/:id/process', 'patch'],
  ] as Array<[string, Method]>)('allows SUPER_ADMIN and ADMIN for refunds %s %s', (path, method) => {
    const middleware = getRouteMiddleware(refundRoutes, path, method);

    for (const role of [AdminRole.SUPER_ADMIN, AdminRole.ADMIN]) {
      expectAllowed(middleware, role);
    }

    for (const role of [AdminRole.SUPPORT, AdminRole.MANAGER, AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Access denied. Required role: super_admin or admin');
    }
  });

  it.each([
    ['/', 'get'],
  ] as Array<[string, Method]>)('allows SUPER_ADMIN, ADMIN and SUPPORT for refunds read %s %s', (path, method) => {
    const middleware = getRouteMiddleware(refundRoutes, path, method);

    for (const role of [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT]) {
      expectAllowed(middleware, role);
    }

    for (const role of [AdminRole.MANAGER, AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Access denied. Required role: super_admin or admin or support');
    }
  });

  it.each([
    ['/:id/cancel', 'patch'],
    ['/:id/correct-email', 'patch'],
    ['/:id/resend', 'post'],
  ] as Array<[string, Method]>)('allows support-level booking mutations for %s %s', (path, method) => {
    const middleware = getRouteMiddleware(bookingRoutes, path, method);

    for (const role of [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT]) {
      expectAllowed(middleware, role);
    }

    for (const role of [AdminRole.MANAGER, AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Access denied. Required role: super_admin or admin or support');
    }
  });

  it.each([
    ['/', 'get'],
    ['/summary', 'get'],
    ['/:id', 'get'],
  ] as Array<[string, Method]>)('allows support-level booking reads for %s %s', (path, method) => {
    const middleware = getRouteMiddleware(bookingRoutes, path, method);

    for (const role of [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT]) {
      expectAllowed(middleware, role);
    }

    for (const role of [AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Access denied. Required role: super_admin or admin or manager or support');
    }
  });

  it.each([
    ['/', 'post'],
    ['/:id', 'put'],
    ['/:id', 'delete'],
    ['/:id/toggle', 'patch'],
  ] as Array<[string, Method]>)('allows only content managers/admins to write coupons %s %s', (path, method) => {
    const middleware = getRouteMiddleware(couponRoutes, path, method);

    for (const role of [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER]) {
      expectAllowed(middleware, role);
    }

    for (const role of [AdminRole.SUPPORT, AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Access denied. Required role: super_admin or admin or manager');
    }
  });

  it.each([
    ['/', 'get'],
    ['/:id', 'get'],
  ] as Array<[string, Method]>)('allows support/managers/admins to read coupons %s %s', (path, method) => {
    const middleware = getRouteMiddleware(couponRoutes, path, method);

    for (const role of [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT]) {
      expectAllowed(middleware, role);
    }

    for (const role of [AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Access denied. Required role: super_admin or admin or manager or support');
    }
  });

  it.each([
    ['/', 'post'],
    ['/:id', 'put'],
    ['/:id', 'delete'],
  ] as Array<[string, Method]>)('allows only content managers/admins to write categories %s %s', (path, method) => {
    const middleware = getRouteMiddleware(categoryRoutes, path, method);

    for (const role of [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER]) {
      expectAllowed(middleware, role);
    }

    for (const role of [AdminRole.SUPPORT, AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Access denied. Required role: super_admin or admin or manager');
    }
  });

  it.each([
    ['/', 'post'],
    ['/:id', 'patch'],
    ['/:id', 'delete'],
  ] as Array<[string, Method]>)('allows only content managers/admins to write tiers %s %s', (path, method) => {
    const middleware = getRouteMiddleware(tierRoutes, path, method);

    for (const role of [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER]) {
      expectAllowed(middleware, role);
    }

    for (const role of [AdminRole.SUPPORT, AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Access denied. Required role: super_admin or admin or manager');
    }
  });

  it.each([
    ['/', 'post'],
    ['/:id', 'put'],
    ['/:id', 'delete'],
    ['/:id/toggle', 'patch'],
  ] as Array<[string, Method]>)('allows only content managers/admins to write popups %s %s', (path, method) => {
    const middleware = getRouteMiddleware(popupRoutes, path, method);

    for (const role of [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER]) {
      expectAllowed(middleware, role);
    }

    for (const role of [AdminRole.SUPPORT, AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Access denied. Required role: super_admin or admin or manager');
    }
  });

  it.each([
    ['/', 'get'],
    ['/:id', 'get'],
  ] as Array<[string, Method]>)('allows support/managers/admins to read popups %s %s', (path, method) => {
    const middleware = getRouteMiddleware(popupRoutes, path, method);

    for (const role of [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT]) {
      expectAllowed(middleware, role);
    }

    for (const role of [AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Access denied. Required role: super_admin or admin or manager or support');
    }
  });

  it.each([
    ['/', 'post'],
    ['/:id', 'put'],
    ['/:id', 'delete'],
  ] as Array<[string, Method]>)('allows only managers/admins to write DJ operators %s %s', (path, method) => {
    const middleware = getRouteMiddleware(djOperatorRoutes, path, method);

    for (const role of [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER]) {
      expectAllowed(middleware, role);
    }

    for (const role of [AdminRole.SUPPORT, AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Access denied. Required role: super_admin or admin or manager');
    }
  });

  it.each([
    ['/summary', 'get'],
    ['/revenue', 'get'],
    ['/attendance/summary', 'get'],
    ['/attendance/rankings', 'get'],
  ] as Array<[string, Method]>)('allows only managers/admins to read analytics %s %s', (path, method) => {
    const middleware = getRouteMiddleware(analyticsRoutes, path, method);

    for (const role of [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER]) {
      expectAllowed(middleware, role);
    }

    for (const role of [AdminRole.SUPPORT, AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Access denied. Required role: super_admin or admin or manager');
    }
  });

  it.each([
    ['/', 'get'],
  ] as Array<[string, Method]>)('allows support/managers/admins to read notifications %s %s', (path, method) => {
    const middleware = getRouteMiddleware(notificationRoutes, path, method);

    for (const role of [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT]) {
      expectAllowed(middleware, role);
    }

    for (const role of [AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Access denied. Required role: super_admin or admin or manager or support');
    }
  });

  it.each([
    ['/:id/retry', 'post'],
  ] as Array<[string, Method]>)('allows support/admins to retry notifications %s %s', (path, method) => {
    const middleware = getRouteMiddleware(notificationRoutes, path, method);

    for (const role of [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT]) {
      expectAllowed(middleware, role);
    }

    for (const role of [AdminRole.MANAGER, AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Access denied. Required role: super_admin or admin or support');
    }
  });

  it.each([
    ['/', 'get'],
  ] as Array<[string, Method]>)('allows only SUPER_ADMIN and ADMIN for webhooks read %s %s', (path, method) => {
    const middleware = getRouteMiddleware(webhookRoutes, path, method);

    for (const role of [AdminRole.SUPER_ADMIN, AdminRole.ADMIN]) {
      expectAllowed(middleware, role);
    }

    for (const role of [AdminRole.MANAGER, AdminRole.SUPPORT, AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Access denied. Required role: super_admin or admin');
    }
  });

  describe('Strict Middleware Validation & Fail-Fast Regression Tests', () => {
    it.each([
      ['SUPERADMIN'],
      ['SUPER_ADMINISTRATOR'],
      ['foo'],
      [''],
      [null],
      [undefined],
    ])('should immediately reject and log if requireAdmin receives malformed/invalid role: %s', (invalidRole) => {
      const req = {
        headers: { authorization: 'Bearer valid-token' },
        admin: undefined,
      } as any;
      const res = mockResponse();
      const next = vi.fn();

      // Mock verifyAdminToken to return the invalid role
      vi.mocked(verifyAdminToken).mockReturnValueOnce({
        sub: 'admin-id',
        email: 'admin@example.com',
        role: invalidRole as any,
      });

      requireAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid role assignment',
      });
      // Verification that no silent repair occurred
      expect(req.admin).toBeUndefined();
    });

    it.each([
      ['SUPERADMIN'],
      ['foo'],
      [''],
      [null],
      [undefined],
    ])('should immediately reject if requireSuperAdmin receives malformed/invalid role: %s', (invalidRole) => {
      const req = {
        admin: {
          sub: 'admin-id',
          email: 'admin@example.com',
          role: invalidRole as any,
        },
      } as any;
      const res = mockResponse();
      const next = vi.fn();

      requireSuperAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid role assignment',
      });
    });

    it.each([
      ['SUPERADMIN'],
      ['foo'],
      [''],
      [null],
      [undefined],
    ])('should immediately reject if requireRole receives malformed/invalid role: %s', (invalidRole) => {
      const req = {
        admin: {
          sub: 'admin-id',
          email: 'admin@example.com',
          role: invalidRole as any,
        },
      } as any;
      const res = mockResponse();
      const next = vi.fn();

      const middleware = requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid role assignment',
      });
    });
  });
});
