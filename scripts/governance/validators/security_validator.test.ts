import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import { SecurityValidator } from './security_validator';
import { RuleRegistry } from '../rules/registry';
import { FileContentCache, ASTParserCache } from '../core/ast_parser_cache';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe('SecurityValidator (PR8A)', () => {
  const validator = new SecurityValidator();

  beforeAll(() => {
    RuleRegistry.initialize();
  });

  beforeEach(() => {
    FileContentCache.clear();
    ASTParserCache.clear();
    vi.clearAllMocks();
  });

  describe('VAL-SEC-001 — Secure Upload Handling', () => {
    it('should pass if standard uploadMiddleware is protected by requireAdmin', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        import { Router } from 'express';
        import { requireAdmin } from '../../middleware/auth.middleware';
        import { uploadMiddleware } from '../../middleware/upload.middleware';
        const router = Router();
        router.post('/image', requireAdmin, uploadMiddleware.single('image'), (req, res) => {});
      `);

      const result = await validator.run(['apps/server/src/routes/admin/upload.routes.ts'], {});
      expect(result.errors.length).toBe(0);
    });

    it('should pass if standard uploadMiddleware is protected globally in the router file', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        import { Router } from 'express';
        import { requireAuth } from '../../middleware/auth.middleware';
        import { uploadMiddleware } from '../../middleware/upload.middleware';
        const router = Router();
        router.use(requireAuth);
        router.post('/avatar', uploadMiddleware.single('avatar'), (req, res) => {});
      `);

      const result = await validator.run(['apps/server/src/routes/user/upload.routes.ts'], {});
      expect(result.errors.length).toBe(0);
    });

    it('should flag if multer is directly imported/configured', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        import { Router } from 'express';
        import multer from 'multer';
        const router = Router();
      `);

      const result = await validator.run(['apps/server/src/routes/custom.routes.ts'], {});
      expect(result.errors.some(e => e.rule === 'VAL-SEC-001')).toBe(true);
      expect(result.errors[0].message).toContain('Direct use of multer configuration is forbidden');
    });

    it('should flag if uploadMiddleware is used on an unprotected endpoint', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        import { Router } from 'express';
        import { uploadMiddleware } from '../../middleware/upload.middleware';
        const router = Router();
        router.post('/anonymous-upload', uploadMiddleware.single('file'), (req, res) => {});
      `);

      const result = await validator.run(['apps/server/src/routes/public/upload.routes.ts'], {});
      expect(result.errors.some(e => e.rule === 'VAL-SEC-001')).toBe(true);
      expect(result.errors[0].message).toContain('exposed without authorization');
    });
  });

  describe('VAL-SEC-002 — RBAC Authorization', () => {
    it('should pass on admin routes protected globally via router.use(requireAdmin)', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        import { Router } from 'express';
        import { requireAdmin } from '../../middleware/auth.middleware';
        const router = Router();
        router.use(requireAdmin);
        router.get('/dashboard', (req, res) => {});
      `);

      const result = await validator.run(['apps/server/src/routes/admin/analytics.routes.ts'], {});
      expect(result.errors.length).toBe(0);
    });

    it('should pass on admin routes where each endpoint specifies requireRole or requireAdmin', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        import { Router } from 'express';
        import { requireRole } from '../../middleware/auth.middleware';
        const router = Router();
        router.get('/sensitive', requireRole('admin'), (req, res) => {});
      `);

      const result = await validator.run(['apps/server/src/routes/admin/sensitive.routes.ts'], {});
      expect(result.errors.length).toBe(0);
    });

    it('should pass on approved public exceptions inside admin routes', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        import { Router } from 'express';
        const router = Router();
        router.post('/login', (req, res) => {});
        router.post('/forgot-password', (req, res) => {});
      `);

      const result = await validator.run(['apps/server/src/routes/admin/auth.routes.ts'], {});
      expect(result.errors.length).toBe(0);
    });

    it('should flag unprotected admin route endpoints', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        import { Router } from 'express';
        const router = Router();
        router.get('/dashboard-metrics', (req, res) => {});
      `);

      const result = await validator.run(['apps/server/src/routes/admin/dashboard.routes.ts'], {});
      expect(result.errors.some(e => e.rule === 'VAL-SEC-002')).toBe(true);
      expect(result.errors[0].message).toContain('exposed without requireAdmin or equivalent');
    });
  });
});
