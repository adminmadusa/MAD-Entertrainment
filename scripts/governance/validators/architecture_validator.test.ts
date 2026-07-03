// scripts/governance/validators/architecture_validator.test.ts

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import { ArchitectureValidator } from './architecture_validator';
import { RuleRegistry } from '../rules/registry';
import { FileContentCache, ASTParserCache } from '../core/ast_parser_cache';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

// ─── Test Helpers ───────────────────────────────────────────────────────────

function setupFile(content: string): void {
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.readFileSync).mockReturnValue(content);
}

// Representative canonical paths matching repository conventions
const SERVER_SERVICE  = 'apps/server/src/services/public/booking.service.ts';
const SERVER_CTRL     = 'apps/server/src/controllers/admin/booking.controller.ts';
const SERVER_PROVIDER = 'apps/server/src/providers/payment.provider.ts';
const SERVER_CONFIG   = 'apps/server/src/config/env.ts';
const SERVER_WORKER   = 'apps/server/src/workers/queue.worker.ts';

const WEB_PROVIDER    = 'apps/web/src/providers/AuthProvider.tsx';
const WEB_HOOK        = 'apps/web/src/hooks/useAuth.ts';
const WEB_ACTION      = 'apps/web/src/app/actions/contact.actions.ts';
const WEB_API_CLIENT  = 'apps/web/src/lib/api/client.ts';
const ADMIN_API_CLIENT = 'apps/admin/src/lib/api/client.ts';
const ZEPTO_ADAPTER   = 'apps/server/src/utils/zeptomail.ts';

const SERVER_TEST     = 'apps/server/src/services/booking.service.test.ts';
const WEB_PAGE        = 'apps/web/src/app/events/page.tsx';

const ROOT_LAYOUT       = 'apps/web/src/app/layout.tsx';
const NESTED_LAYOUT     = 'apps/web/src/app/legal/layout.tsx';
const DEEP_LAYOUT       = 'apps/web/src/app/checkout/payment/confirm/layout.tsx';
const GROUP_LAYOUT      = 'apps/web/src/app/(auth)/layout.tsx';
const PARALLEL_LAYOUT   = 'apps/web/src/app/@modal/layout.tsx';

const SHARED_VALIDATION = 'packages/validations/src/index.ts';
const SERVER_VALIDATION = 'apps/server/src/validations/booking.validation.ts';

const validator = new ArchitectureValidator();

// ─── Setup ──────────────────────────────────────────────────────────────────

describe('ArchitectureValidator (PR8C)', () => {
  beforeAll(() => {
    RuleRegistry.initialize();
  });

  beforeEach(() => {
    FileContentCache.clear();
    ASTParserCache.clear();
    vi.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  VAL-ARC-001 — Observability Isolation (server-only)
  // ══════════════════════════════════════════════════════════════════════════

  describe('VAL-ARC-001 — Observability Isolation', () => {

    it('should pass: approved logger usage in server service', async () => {
      setupFile(`
        import { logger } from '../../utils/logger';
        export function doWork() {
          logger.info('Processing booking');
          logger.error({ err }, 'Failed to process booking');
        }
      `);
      const result = await validator.run([SERVER_SERVICE], {});
      const arc001 = result.warnings.filter(w => w.rule === 'VAL-ARC-001');
      expect(arc001.length).toBe(0);
    });

    it('should warn: console.error in server service', async () => {
      setupFile(`
        export function doWork() {
          console.error('Post-commit enqueue failed:', err);
        }
      `);
      const result = await validator.run([SERVER_SERVICE], {});
      const arc001 = result.warnings.filter(w => w.rule === 'VAL-ARC-001');
      expect(arc001.length).toBe(1);
      expect(arc001[0].message).toContain('console.error');
      expect(arc001[0].message).toContain('logger');
    });

    it('should warn: console.log in server controller', async () => {
      setupFile(`
        export function handleRequest(req: Request, res: Response) {
          console.log('Incoming request:', req.body);
        }
      `);
      const result = await validator.run([SERVER_CTRL], {});
      const arc001 = result.warnings.filter(w => w.rule === 'VAL-ARC-001');
      expect(arc001.length).toBe(1);
      expect(arc001[0].message).toContain('console.log');
    });

    it('should warn: console.warn in server worker', async () => {
      setupFile(`
        export function runJob() {
          console.warn('Queue retry warning');
        }
      `);
      const result = await validator.run([SERVER_WORKER], {});
      const arc001 = result.warnings.filter(w => w.rule === 'VAL-ARC-001');
      expect(arc001.length).toBe(1);
      expect(arc001[0].message).toContain('console.warn');
    });

    it('should report all five console methods', async () => {
      setupFile(`
        function all() {
          console.log('log');
          console.warn('warn');
          console.error('error');
          console.info('info');
          console.debug('debug');
        }
      `);
      const result = await validator.run([SERVER_SERVICE], {});
      const arc001 = result.warnings.filter(w => w.rule === 'VAL-ARC-001');
      expect(arc001.length).toBe(5);
    });

    it('should NOT flag: console calls in server config file (pre-logger startup)', async () => {
      setupFile(`
        export function validateEnv() {
          console.error('❌ Missing required env var: DATABASE_URL');
          process.exit(1);
        }
      `);
      const result = await validator.run([SERVER_CONFIG], {});
      const arc001 = result.warnings.filter(w => w.rule === 'VAL-ARC-001');
      expect(arc001.length).toBe(0);
    });

    it('should NOT flag: console calls in server test files', async () => {
      setupFile(`
        it('should log error', () => {
          console.log('test debug output');
        });
      `);
      const result = await validator.run([SERVER_TEST], {});
      const arc001 = result.warnings.filter(w => w.rule === 'VAL-ARC-001');
      expect(arc001.length).toBe(0);
    });

    it('should NOT flag: console calls in web app (no approved logger exists)', async () => {
      setupFile(`
        export default function ErrorPage({ error }: { error: Error }) {
          console.error('[MAD Error Boundary]', error);
        }
      `);
      const result = await validator.run([WEB_PAGE], {});
      const arc001 = result.warnings.filter(w => w.rule === 'VAL-ARC-001');
      expect(arc001.length).toBe(0);
    });

    it('should NOT flag: console calls in web provider (not server scope)', async () => {
      setupFile(`
        export function AuthProvider({ children }: { children: React.ReactNode }) {
          console.warn('Session hydration warning');
        }
      `);
      const result = await validator.run([WEB_PROVIDER], {});
      const arc001 = result.warnings.filter(w => w.rule === 'VAL-ARC-001');
      expect(arc001.length).toBe(0);
    });

    it('should include required finding fields: rule, severity, message, file, line, snippet', async () => {
      setupFile(`export function fn() { console.error('Bad', err); }`);
      const result = await validator.run([SERVER_SERVICE], {});
      const finding = result.warnings.filter(w => w.rule === 'VAL-ARC-001')[0];
      expect(finding).toBeDefined();
      expect(finding.rule).toBe('VAL-ARC-001');
      expect(finding.severity).toBe('WARNING');
      expect(finding.message).toBeTruthy();
      expect(finding.file).toBe(SERVER_SERVICE);
      expect(finding.line).toBeGreaterThan(0);
      expect(finding.snippet).toBeTruthy();
    });

  });

  // ══════════════════════════════════════════════════════════════════════════
  //  VAL-ARC-002 — Direct Axios Import in Business Layers
  // ══════════════════════════════════════════════════════════════════════════

  describe('VAL-ARC-002 — DTO Governance / Direct Axios in Business Layers', () => {

    it('should pass: service importing from approved apiClient wrapper', async () => {
      setupFile(`
        import { apiClient } from '../../lib/api/client';
        export async function fetchEvents() {
          return apiClient.get('/events');
        }
      `);
      const result = await validator.run([SERVER_SERVICE], {});
      const arc002 = result.warnings.filter(w => w.rule === 'VAL-ARC-002');
      expect(arc002.length).toBe(0);
    });

    it('should warn: server service directly importing axios', async () => {
      setupFile(`
        import axios from 'axios';
        export async function processRefund(id: string) {
          return axios.post('/refund', { id });
        }
      `);
      const result = await validator.run([SERVER_SERVICE], {});
      const arc002 = result.warnings.filter(w => w.rule === 'VAL-ARC-002');
      expect(arc002.length).toBe(1);
      expect(arc002[0].message).toContain('import axios');
    });

    it('should warn: web provider directly importing axios', async () => {
      setupFile(`
        import axios from 'axios';
        export function AuthProvider({ children }: { children: React.ReactNode }) {
          axios.post('/auth/refresh', {});
        }
      `);
      const result = await validator.run([WEB_PROVIDER], {});
      const arc002 = result.warnings.filter(w => w.rule === 'VAL-ARC-002');
      expect(arc002.length).toBe(1);
      expect(arc002[0].message).toContain('business layer');
    });

    it('should warn: web hook directly importing axios', async () => {
      setupFile(`
        import axios from 'axios';
        export function useAuth() {
          return axios.get('/me');
        }
      `);
      const result = await validator.run([WEB_HOOK], {});
      const arc002 = result.warnings.filter(w => w.rule === 'VAL-ARC-002');
      expect(arc002.length).toBe(1);
    });

    it('should warn: web action directly importing axios', async () => {
      setupFile(`
        import axios from 'axios';
        export async function submitContact(data: unknown) {
          return axios.post('/contact', data);
        }
      `);
      const result = await validator.run([WEB_ACTION], {});
      const arc002 = result.warnings.filter(w => w.rule === 'VAL-ARC-002');
      expect(arc002.length).toBe(1);
    });

    it('should NOT flag: approved axios client wrapper (web)', async () => {
      setupFile(`
        import axios, { AxiosInstance } from 'axios';
        export const apiClient: AxiosInstance = axios.create({ baseURL: '/api' });
      `);
      const result = await validator.run([WEB_API_CLIENT], {});
      const arc002 = result.warnings.filter(w => w.rule === 'VAL-ARC-002');
      expect(arc002.length).toBe(0);
    });

    it('should NOT flag: approved axios client wrapper (admin)', async () => {
      setupFile(`
        import axios, { AxiosInstance } from 'axios';
        export const adminApiClient: AxiosInstance = axios.create({ baseURL: '/admin-api' });
      `);
      const result = await validator.run([ADMIN_API_CLIENT], {});
      const arc002 = result.warnings.filter(w => w.rule === 'VAL-ARC-002');
      expect(arc002.length).toBe(0);
    });

    it('should NOT flag: approved infrastructure adapter (zeptomail)', async () => {
      setupFile(`
        import axios from 'axios';
        export async function sendEmail(to: string, subject: string) {
          return axios.post('https://api.zeptomail.in/v1.1/email', { to, subject });
        }
      `);
      const result = await validator.run([ZEPTO_ADAPTER], {});
      const arc002 = result.warnings.filter(w => w.rule === 'VAL-ARC-002');
      expect(arc002.length).toBe(0);
    });

    it('should NOT flag: axios import in test files', async () => {
      setupFile(`
        import axios from 'axios';
        vi.mock('axios');
        it('mocks axios', () => {});
      `);
      const result = await validator.run([SERVER_TEST], {});
      const arc002 = result.warnings.filter(w => w.rule === 'VAL-ARC-002');
      expect(arc002.length).toBe(0);
    });

    it('should NOT flag: server controller that does NOT import axios', async () => {
      setupFile(`
        import { BookingService } from '../../services/booking.service';
        export async function createBooking(req: Request, res: Response) {
          const result = await BookingService.create(req.body);
          res.json(result);
        }
      `);
      const result = await validator.run([SERVER_CTRL], {});
      const arc002 = result.warnings.filter(w => w.rule === 'VAL-ARC-002');
      expect(arc002.length).toBe(0);
    });

    it('should include required finding fields', async () => {
      setupFile(`import axios from 'axios';\nexport async function fn() { return axios.get('/x'); }`);
      const result = await validator.run([SERVER_SERVICE], {});
      const finding = result.warnings.filter(w => w.rule === 'VAL-ARC-002')[0];
      expect(finding).toBeDefined();
      expect(finding.rule).toBe('VAL-ARC-002');
      expect(finding.severity).toBe('WARNING');
      expect(finding.message).toBeTruthy();
      expect(finding.file).toBe(SERVER_SERVICE);
      expect(finding.line).toBeGreaterThan(0);
      expect(finding.snippet).toBeTruthy();
    });

  });

  // ══════════════════════════════════════════════════════════════════════════
  //  VAL-ARC-003 — App Router Layout Safety
  // ══════════════════════════════════════════════════════════════════════════

  describe('VAL-ARC-003 — App Router Layout Safety', () => {

    it('should pass: root layout (depth 1)', async () => {
      setupFile(`export default function Layout({ children }) { return <html>{children}</html>; }`);
      const result = await validator.run([ROOT_LAYOUT], {});
      const arc003 = result.warnings.filter(w => w.rule === 'VAL-ARC-003');
      expect(arc003.length).toBe(0);
    });

    it('should pass: one level of nesting (depth 2 — within limit)', async () => {
      setupFile(`export default function Layout({ children }) { return <div>{children}</div>; }`);
      const result = await validator.run([ROOT_LAYOUT, NESTED_LAYOUT], {});
      const arc003 = result.warnings.filter(w => w.rule === 'VAL-ARC-003');
      expect(arc003.length).toBe(0);
    });

    it('should warn: layout nesting depth exceeds max (depth > 3)', async () => {
      setupFile(`export default function Layout({ children }) { return <div>{children}</div>; }`);
      const result = await validator.run([ROOT_LAYOUT, DEEP_LAYOUT], {});
      const arc003 = result.warnings.filter(w => w.rule === 'VAL-ARC-003');
      // DEEP_LAYOUT = .../checkout/payment/confirm/layout.tsx = depth 4
      expect(arc003.length).toBeGreaterThan(0);
      expect(arc003[0].message).toContain('depth');
    });

    it('should NOT flag: route group layout (depth unchanged)', async () => {
      // (auth) is a transparent segment — does not count toward depth
      setupFile(`export default function Layout({ children }) { return <div>{children}</div>; }`);
      const result = await validator.run([ROOT_LAYOUT, GROUP_LAYOUT], {});
      const arc003 = result.warnings.filter(w => w.rule === 'VAL-ARC-003');
      expect(arc003.length).toBe(0);
    });

    it('should NOT flag: parallel route layout (@slot is transparent)', async () => {
      setupFile(`export default function Layout({ children }) { return <div>{children}</div>; }`);
      const result = await validator.run([ROOT_LAYOUT, PARALLEL_LAYOUT], {});
      const arc003 = result.warnings.filter(w => w.rule === 'VAL-ARC-003');
      expect(arc003.length).toBe(0);
    });

    it('should report file path and depth in finding message', async () => {
      setupFile(`export default function Layout({ children }) { return <div>{children}</div>; }`);
      const result = await validator.run([ROOT_LAYOUT, DEEP_LAYOUT], {});
      const arc003 = result.warnings.filter(w => w.rule === 'VAL-ARC-003');
      if (arc003.length > 0) {
        expect(arc003[0].file).toBeTruthy();
        expect(arc003[0].message).toContain('max');
      }
    });

  });

  // ══════════════════════════════════════════════════════════════════════════
  //  VAL-ARC-004 — Validation Drift Prevention
  // ══════════════════════════════════════════════════════════════════════════

  describe('VAL-ARC-004 — Validation Drift Prevention', () => {

    it('should pass: importing schema from shared validation package', async () => {
      setupFile(`
        import { CreateBookingSchema } from '@mad/validations';
        export async function createBooking(data: unknown) {
          return CreateBookingSchema.parse(data);
        }
      `);
      const result = await validator.run([SERVER_SERVICE], {});
      const arc004 = result.warnings.filter(w => w.rule === 'VAL-ARC-004');
      expect(arc004.length).toBe(0);
    });

    it('should warn: local z.object() in a server service', async () => {
      setupFile(`
        import { z } from 'zod';
        const BookingSchema = z.object({ id: z.string(), amount: z.number() });
        export function validate(data: unknown) { return BookingSchema.parse(data); }
      `);
      const result = await validator.run([SERVER_SERVICE], {});
      const arc004 = result.warnings.filter(w => w.rule === 'VAL-ARC-004');
      expect(arc004.length).toBeGreaterThan(0);
      expect(arc004[0].message).toContain('packages/validations');
    });

    it('should warn: local z.string() in a server controller', async () => {
      setupFile(`
        import { z } from 'zod';
        export function handler(req: Request) {
          const schema = z.string().min(1);
          schema.parse(req.body.name);
        }
      `);
      const result = await validator.run([SERVER_CTRL], {});
      const arc004 = result.warnings.filter(w => w.rule === 'VAL-ARC-004');
      expect(arc004.length).toBeGreaterThan(0);
    });

    it('should warn: local z.array() in server provider', async () => {
      setupFile(`
        import { z } from 'zod';
        const TagsSchema = z.array(z.string());
      `);
      const result = await validator.run([SERVER_PROVIDER], {});
      const arc004 = result.warnings.filter(w => w.rule === 'VAL-ARC-004');
      expect(arc004.length).toBeGreaterThan(0);
    });

    it('should NOT flag: z.object() inside the shared validations package', async () => {
      setupFile(`
        import { z } from 'zod';
        export const CreateBookingSchema = z.object({ id: z.string() });
      `);
      const result = await validator.run([SHARED_VALIDATION], {});
      const arc004 = result.warnings.filter(w => w.rule === 'VAL-ARC-004');
      expect(arc004.length).toBe(0);
    });

    it('should NOT flag: z.object() in server validations bridge directory', async () => {
      setupFile(`
        import { z } from 'zod';
        export const LocalSchema = z.object({ name: z.string() });
      `);
      const result = await validator.run([SERVER_VALIDATION], {});
      const arc004 = result.warnings.filter(w => w.rule === 'VAL-ARC-004');
      expect(arc004.length).toBe(0);
    });

    it('should NOT flag: z.object() in test files', async () => {
      setupFile(`
        import { z } from 'zod';
        const TestSchema = z.object({ id: z.string() });
        it('parses schema', () => { TestSchema.parse({ id: '1' }); });
      `);
      const result = await validator.run([SERVER_TEST], {});
      const arc004 = result.warnings.filter(w => w.rule === 'VAL-ARC-004');
      expect(arc004.length).toBe(0);
    });

    it('should NOT flag: file uses zod but only calls .parse()/.safeParse()', async () => {
      // .parse() is not in ZOD_SCHEMA_BUILDERS — it's a schema *usage*, not definition
      setupFile(`
        import { CreateBookingSchema } from '@mad/validations';
        export function validate(data: unknown) {
          return CreateBookingSchema.safeParse(data);
        }
      `);
      const result = await validator.run([SERVER_SERVICE], {});
      const arc004 = result.warnings.filter(w => w.rule === 'VAL-ARC-004');
      expect(arc004.length).toBe(0);
    });

    it('should include required finding fields', async () => {
      setupFile(`import { z } from 'zod';\nconst s = z.object({ x: z.string() });`);
      const result = await validator.run([SERVER_SERVICE], {});
      const finding = result.warnings.filter(w => w.rule === 'VAL-ARC-004')[0];
      expect(finding).toBeDefined();
      expect(finding.rule).toBe('VAL-ARC-004');
      expect(finding.severity).toBe('WARNING');
      expect(finding.message).toBeTruthy();
      expect(finding.file).toBe(SERVER_SERVICE);
      expect(finding.line).toBeGreaterThan(0);
      expect(finding.snippet).toBeTruthy();
    });

  });

  // ══════════════════════════════════════════════════════════════════════════
  //  Cross-cutting: validator structural guarantees
  // ══════════════════════════════════════════════════════════════════════════

  describe('Structural Guarantees', () => {

    it('should have name ArchitectureValidator', () => {
      expect(validator.name).toBe('ArchitectureValidator');
    });

    it('should return a deterministic ValidationResult', async () => {
      setupFile(`export function fn() {}`);
      const result = await validator.run([SERVER_SERVICE], {});
      expect(typeof result.name).toBe('string');
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(typeof result.executionTimeMs).toBe('number');
    });

    it('should produce no findings on empty file list', async () => {
      const result = await validator.run([], {});
      expect(result.warnings.length).toBe(0);
      expect(result.errors.length).toBe(0);
      expect(result.success).toBe(true);
    });

    it('should be idempotent: same input produces same output', async () => {
      setupFile(`export function fn() { console.error('Bad'); }`);
      const r1 = await validator.run([SERVER_SERVICE], {});
      FileContentCache.clear();
      ASTParserCache.clear();
      vi.clearAllMocks();
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`export function fn() { console.error('Bad'); }`);
      const r2 = await validator.run([SERVER_SERVICE], {});
      expect(r1.warnings.length).toBe(r2.warnings.length);
      expect(r1.warnings[0]?.rule).toBe(r2.warnings[0]?.rule);
      expect(r1.warnings[0]?.line).toBe(r2.warnings[0]?.line);
    });

  });

});
