// scripts/governance/validators/barrel_file_validator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BarrelFileValidator } from './barrel_file_validator';

vi.mock('../core/ast_parser_cache', () => ({
  FileContentCache: {
    getFileContent: vi.fn(),
  },
}));

vi.mock('../core/governance.config', () => ({
  governanceConfig: { scanScope: { excludedPaths: ['scripts/governance'] } },
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, existsSync: vi.fn().mockReturnValue(false) };
});

import { FileContentCache } from '../core/ast_parser_cache';
const mockGet = vi.mocked(FileContentCache.getFileContent);

describe('BarrelFileValidator', () => {
  let validator: BarrelFileValidator;

  beforeEach(() => {
    validator = new BarrelFileValidator();
    vi.clearAllMocks();
  });

  it('should pass for a clean barrel file', async () => {
    mockGet.mockReturnValue(`
export { Button } from './Button';
export { Modal } from './Modal';
export type { ButtonProps } from './Button';
    `);

    const result = await validator.run(['packages/ui/src/index.ts'], {});

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should error on duplicate named exports', async () => {
    mockGet.mockReturnValue(`
export { Button } from './Button';
export { Button } from './ButtonV2';
    `);

    const result = await validator.run(['packages/ui/src/index.ts'], {});

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].rule).toBe('VAL-ARC-007');
    expect(result.errors[0].message).toContain("Duplicate export 'Button'");
  });

  it('should error on export from internal/ path', async () => {
    mockGet.mockReturnValue(`
export { InternalHelper } from './internal/helpers';
    `);

    const result = await validator.run(['packages/shared/src/index.ts'], {});

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('internal');
  });

  it('should error on export from private/ path', async () => {
    mockGet.mockReturnValue(`
export { SecretThing } from './private/secret';
    `);

    const result = await validator.run(['packages/utils/src/index.ts'], {});

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('private');
  });

  it('should warn on empty barrel', async () => {
    mockGet.mockReturnValue(`// no exports`);

    const result = await validator.run(['packages/ui/src/index.ts'], {});

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].message).toContain('Empty barrel');
  });

  it('should skip apps/ barrel files', async () => {
    mockGet.mockReturnValue(`
export { Button } from './Button';
export { Button } from './ButtonV2';
    `);

    const result = await validator.run(['apps/web/src/index.ts'], {});

    expect(result.errors).toHaveLength(0);
    expect(result.statistics.barrelsScanned).toBe(0);
  });

  it('should skip excluded paths', async () => {
    mockGet.mockReturnValue(`export { x } from './internal/x';`);

    const result = await validator.run(
      ['scripts/governance/validators/index.ts'],
      {}
    );

    expect(result.errors).toHaveLength(0);
  });
});
