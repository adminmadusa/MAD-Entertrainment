// scripts/governance/validators/deep_import_validator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeepImportValidator } from './deep_import_validator';

vi.mock('../core/ast_parser_cache', () => ({
  FileContentCache: {
    get: vi.fn(),
  },
}));

vi.mock('../core/governance.config', () => ({
  governanceConfig: {
    scanScope: { excludedPaths: ['scripts/governance'] },
    deepImportExceptions: [],
  },
}));

import { FileContentCache } from '../core/ast_parser_cache';
const mockGet = vi.mocked(FileContentCache.get);

describe('DeepImportValidator', () => {
  let validator: DeepImportValidator;

  beforeEach(() => {
    validator = new DeepImportValidator();
    vi.clearAllMocks();
  });

  it('should pass for clean public barrel imports', async () => {
    mockGet.mockReturnValue(`
import { Button } from '@mad/ui';
import type { Event } from '@mad/types';
import { BookingStatus } from '@mad/shared';
import { formatDate } from '@mad/utils';
import { emailSchema } from '@mad/validations';
    `);

    const result = await validator.run(['apps/web/src/page.tsx'], {});

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail for a deep @mad/ui/src/ import', async () => {
    mockGet.mockReturnValue(`
import { Button } from '@mad/ui/src/primitives/Button/Button';
    `);

    const result = await validator.run(['apps/web/src/page.tsx'], {});

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule).toBe('VAL-ARC-006');
    expect(result.errors[0].severity).toBe('ERROR');
    expect(result.errors[0].message).toContain('@mad/ui/src/primitives/Button/Button');
  });

  it('should fail for a deep @mad/shared/src/internal import', async () => {
    mockGet.mockReturnValue(`
import { x } from '@mad/shared/src/internal/utils';
    `);

    const result = await validator.run(['apps/server/src/service.ts'], {});

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].rule).toBe('VAL-ARC-006');
  });

  it('should pass for relative imports (own-package)', async () => {
    mockGet.mockReturnValue(`
import { helper } from './helpers/format';
import { schema } from '../schemas/booking';
    `);

    const result = await validator.run(['apps/server/src/service.ts'], {});

    expect(result.errors).toHaveLength(0);
  });

  it('should exclude test files', async () => {
    mockGet.mockReturnValue(`
import { Button } from '@mad/ui/src/internal';
    `);

    const result = await validator.run(['apps/web/src/button.test.ts'], {});

    expect(result.errors).toHaveLength(0);
    expect(result.statistics.filesScanned).toBe(0);
  });

  it('should exclude files in excluded paths', async () => {
    mockGet.mockReturnValue(`
import { x } from '@mad/ui/src/internal';
    `);

    const result = await validator.run(
      ['scripts/governance/validators/test.ts'],
      {}
    );

    expect(result.errors).toHaveLength(0);
  });

  it('should report correct line number for violation', async () => {
    mockGet.mockReturnValue(`// comment
// another comment
import { Foo } from '@mad/types/src/internal/foo';
`);

    const result = await validator.run(['apps/web/src/page.tsx'], {});

    expect(result.errors[0].line).toBe(3);
  });
});
