import { AdminRole } from '@mad/shared';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import teamRoutes from './team.routes';

function mockResponse() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function getRouteMiddleware(path: string, method: 'get' | 'post' | 'patch') {
  const layer = (teamRoutes as any).stack.find((item: any) => {
    return item.route?.path === path && item.route?.methods?.[method];
  });

  if (!layer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  return layer.route.stack[0].handle;
}

describe('admin team routes RBAC', () => {
  const protectedRoutes: Array<[string, 'get' | 'post' | 'patch']> = [
    ['/', 'get'],
    ['/', 'post'],
    ['/:id/toggle', 'patch'],
  ];

  it.each(protectedRoutes)('allows SUPER_ADMIN for %s %s', (path, method) => {
    const middleware = getRouteMiddleware(path, method);
    const req = { admin: { sub: 'super-admin-id', email: 'root@example.com', role: AdminRole.SUPER_ADMIN } };
    const res = mockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it.each([
    AdminRole.ADMIN,
    AdminRole.SUPPORT,
    AdminRole.MANAGER,
    AdminRole.SCANNER,
  ])('denies %s for all team management routes', (role) => {
    for (const [path, method] of protectedRoutes) {
      const middleware = getRouteMiddleware(path, method);
      const req = { admin: { sub: `${role}-id`, email: `${role}@example.com`, role } };
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Super admin access required',
      });
    }
  });
});
