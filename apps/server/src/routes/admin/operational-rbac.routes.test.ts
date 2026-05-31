import { AdminRole } from '@mad/shared';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
  },
}));

vi.mock('../../controllers/admin/diagnostics.controller', () => ({
  getConsistencyDiagnostics: vi.fn(),
  listReservations: vi.fn(),
  repairConsistency: vi.fn(),
  getSystemDiagnostics: vi.fn(),
  retryFailedJob: vi.fn(),
  retryAllFailedJobs: vi.fn(),
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

import bookingRoutes from './booking.routes';
import diagnosticsRoutes from './diagnostics.routes';
import refundRoutes from './refund.routes';

type Method = 'get' | 'post' | 'patch';

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

  return layer.route.stack[0].handle;
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

  it.each([
    ['/consistency/repair', 'post'],
    ['/dlq/:id/retry', 'post'],
    ['/dlq/retry-all', 'post'],
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
});
