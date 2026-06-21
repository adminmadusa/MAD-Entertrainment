import { describe, expect, it, vi, beforeEach } from 'vitest';

// ─── Mock env BEFORE anything else ───
vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'testsecret',
    JWT_ADMIN_SECRET: 'testsecret',
    JWT_SESSION_SECRET: 'testsecret',
  })),
}));

// ─── Mocks must be registered BEFORE the router is imported ───
vi.mock('../../middleware/auth.middleware', () => ({
  requireAdmin: vi.fn((req: any, res: any, next: any) => next()),
}));

vi.mock('../../middleware/validation.middleware', () => ({
  validate: vi.fn(() => vi.fn((req: any, res: any, next: any) => next())),
}));

vi.mock('../../controllers/admin/upload.controller', () => ({
  deleteUpload: vi.fn((req: any, res: any) => res.status(200).json({ success: true, message: 'Image deleted securely' })),
  uploadImage: vi.fn((req: any, res: any) => res.status(200).json({ success: true })),
}));

// ─── Import AFTER mocks are registered ────────────────────────
import router from './upload.routes';
import { requireAdmin } from '../../middleware/auth.middleware';
import { deleteUpload } from '../../controllers/admin/upload.controller';
import { validate } from '../../middleware/validation.middleware';
import { deleteUploadSchema } from '../../validations/admin-content.validation';

function getHandlers(method: 'delete' | 'post', path: string): any[] {
  const layer = router.stack.find(
    (item: any) => item.route?.path === path && item.route?.methods?.[method]
  );
  if (!layer) throw new Error(`Route ${method.toUpperCase()} ${path} not found in router stack`);
  return layer.route.stack.map((s: any) => s.handle);
}

describe('admin/upload.routes — DELETE /', () => {
  beforeEach(() => {
    vi.mocked(deleteUpload).mockClear();
  });

  it('requires admin authentication via router-level middleware', () => {
    const hasRequireAdmin = router.stack.some((layer: any) => layer.handle === requireAdmin);
    expect(hasRequireAdmin).toBe(true);
  });

  it('has validation in the middleware chain', () => {
    getHandlers('delete', '/');
    expect(validate).toHaveBeenCalledWith(deleteUploadSchema);
  });

  it('delegates to deleteUpload controller handler', () => {
    const handlers = getHandlers('delete', '/');
    expect(handlers).toContain(deleteUpload);
  });
});
