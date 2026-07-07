import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AdminRole } from '@mad/shared';

import { requireAdmin, requireRole } from '../../middleware/auth.middleware';
import { AppError } from '../../middleware/error.middleware';
import { validate, validateQuery } from '../../middleware/validation.middleware';
import {
  adminUsersQuerySchema,
  adminUserByIdSchema,
  adminUserByEmailSchema,
} from '../../validations/admin-user.validation';

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

vi.mock('../../controllers/admin/user.controller', () => ({
  getUsers: vi.fn(),
  getUserById: vi.fn(),
  getGuestUserByEmail: vi.fn(),
  toggleUserActive: vi.fn(),
}));

import userRoutes from './user.routes';

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

  const handlers = layer.route.stack.map((s: any) => s.handle);
  const guard = handlers.find(
    (h: any) =>
      h.name === 'requireSuperAdmin' ||
      h.name === 'requireAdmin' ||
      (h.toString().includes('roles') && h.toString().includes('req.admin')) ||
      (h.length === 3 && !h.toString().includes('validate'))
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

describe('admin users routes RBAC authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires admin authentication for user router stack', () => {
    const middleware = getRouterAuthMiddleware(userRoutes);
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
    ['/', 'get'],
    ['/:id', 'get'],
    ['/guest/:email', 'get'],
  ] as Array<[string, Method]>)('allows SUPER_ADMIN, ADMIN, MANAGER, and SUPPORT for read routes: %s %s', (path, method) => {
    const middleware = getRouteMiddleware(userRoutes, path, method);

    for (const role of [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT]) {
      expectAllowed(middleware, role);
    }

    for (const role of [AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Access denied. Required role: super_admin or admin or manager or support');
    }
  });

  it.each([
    ['/:id/toggle-active', 'patch'],
  ] as Array<[string, Method]>)('allows only SUPER_ADMIN and ADMIN for toggle active status write mutations: %s %s', (path, method) => {
    const middleware = getRouteMiddleware(userRoutes, path, method);

    for (const role of [AdminRole.SUPER_ADMIN, AdminRole.ADMIN]) {
      expectAllowed(middleware, role);
    }

    for (const role of [AdminRole.MANAGER, AdminRole.SUPPORT, AdminRole.SCANNER]) {
      expectDenied(middleware, role, 'Access denied. Required role: super_admin or admin');
    }
  });
});

describe('admin users validations middleware tests', () => {
  it('throws validation error if limit exceeds 100', async () => {
    const middleware = validateQuery(adminUsersQuerySchema);
    const req = { query: { limit: 101, type: 'registered' } } as any;
    const res = {} as any;
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('Validation failed');
  });

  it('throws validation error if invalid sort field is provided', async () => {
    const middleware = validateQuery(adminUsersQuerySchema);
    const req = { query: { sortField: 'invalid-field', type: 'registered' } } as any;
    const res = {} as any;
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('Validation failed');
  });

  it('throws validation error if invalid ObjectId is provided', async () => {
    const middleware = validate(adminUserByIdSchema);
    const req = { params: { id: 'invalid-object-id' } } as any;
    const res = {} as any;
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('params.id');
  });

  it('throws validation error if invalid email format is provided', async () => {
    const middleware = validate(adminUserByEmailSchema);
    const req = { params: { email: 'not-an-email' } } as any;
    const res = {} as any;
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('params.email');
  });
});
