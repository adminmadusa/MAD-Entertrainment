import { describe, expect, it, vi, beforeEach } from 'vitest';

// ─── Mocks must be registered BEFORE the router is imported ───
vi.mock('../../controllers/admin/auth.controller', () => ({
  adminAuthController: {
    login: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
    getMe: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
    logout: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
  },
}));

vi.mock('../../middleware/auth.middleware', () => ({
  requireAdmin: vi.fn((req: any, res: any, next: any) => next()),
}));

vi.mock('../../middleware/rate.middleware', () => {
  const mockAdminLimiter = vi.fn((req: any, res: any, next: any) => {
    if (req.simulateAdminLimitExceeded) {
      return res.status(429).json({ success: false, message: 'Too many requests, please try again later.' });
    }
    return next();
  });
  return {
    adminLimiter: mockAdminLimiter,
  };
});

vi.mock('../../middleware/validation.middleware', () => ({
  validate: vi.fn(() => vi.fn((req: any, res: any, next: any) => next())),
}));

vi.mock('../../validations/admin.validation', () => ({
  adminLoginSchema: {},
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
import router from './auth.routes';
import { adminLimiter } from '../../middleware/rate.middleware';
import { requireAdmin } from '../../middleware/auth.middleware';
import { adminAuthController } from '../../controllers/admin/auth.controller';

// ─── Helpers ──────────────────────────────────────────────────
function getHandlers(method: 'get' | 'post', path: string): any[] {
  const layer = router.stack.find(
    (item: any) => item.route?.path === path && item.route?.methods?.[method]
  );
  if (!layer) throw new Error(`Route ${method.toUpperCase()} ${path} not found in router stack`);
  return layer.route.stack.map((s: any) => s.handle);
}

async function runChain(handlers: any[], req: any, res: any) {
  let index = 0;
  const next = async (err?: any) => {
    if (err) throw err;
    if (index < handlers.length) {
      const h = handlers[index++];
      await h(req, res, next);
    }
  };
  await next();
}

// ─── Tests ────────────────────────────────────────────────────
describe('admin/auth.routes — POST /login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('has adminLimiter in the middleware chain', () => {
    const handlers = getHandlers('post', '/login');
    expect(handlers).toContain(adminLimiter);
  });

  it('places adminLimiter before the controller', () => {
    const handlers = getHandlers('post', '/login');
    const limiterIndex = handlers.indexOf(adminLimiter);
    const controllerIndex = handlers.indexOf(adminAuthController.login);
    expect(limiterIndex).toBeGreaterThanOrEqual(0);
    expect(controllerIndex).toBeGreaterThan(limiterIndex);
  });

  it('does NOT apply requireAdmin (login is unauthenticated)', () => {
    const handlers = getHandlers('post', '/login');
    expect(handlers).not.toContain(requireAdmin);
  });

  it('allows the request through and calls the controller when limit is not exceeded', async () => {
    const handlers = getHandlers('post', '/login');
    const req: any = { simulateAdminLimitExceeded: false, body: { email: 'a@b.com', password: 'pass' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };

    await runChain(handlers, req, res);

    expect(adminLimiter).toHaveBeenCalled();
    expect(adminAuthController.login).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 429 and does NOT call the controller when limit is exceeded', async () => {
    const handlers = getHandlers('post', '/login');
    const req: any = { simulateAdminLimitExceeded: true, body: { email: 'a@b.com', password: 'pass' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };

    await runChain(handlers, req, res);

    expect(adminLimiter).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Too many requests, please try again later.' })
    );
    expect(adminAuthController.login).not.toHaveBeenCalled();
  });
});

describe('admin/auth.routes — GET /me', () => {
  beforeEach(() => vi.clearAllMocks());

  it('has requireAdmin in the middleware chain', () => {
    const handlers = getHandlers('get', '/me');
    expect(handlers).toContain(requireAdmin);
  });

  it('does NOT apply adminLimiter to /me', () => {
    const handlers = getHandlers('get', '/me');
    expect(handlers).not.toContain(adminLimiter);
  });
});

describe('admin/auth.routes — POST /logout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('has requireAdmin in the middleware chain', () => {
    const handlers = getHandlers('post', '/logout');
    expect(handlers).toContain(requireAdmin);
  });

  it('does NOT apply adminLimiter to /logout', () => {
    const handlers = getHandlers('post', '/logout');
    expect(handlers).not.toContain(adminLimiter);
  });
});
