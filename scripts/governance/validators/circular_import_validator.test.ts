// scripts/governance/validators/circular_import_validator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircularImportValidator } from './circular_import_validator';
import * as DependencyAnalyzerModule from '../core/dependency_analyzer';

vi.mock('../core/dependency_analyzer', () => ({
  DependencyAnalyzer: {
    analyzeImports: vi.fn().mockReturnValue([]),
  },
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, existsSync: vi.fn().mockReturnValue(true) };
});

vi.mock('../core/governance.config', () => ({
  governanceConfig: { scanScope: { excludedPaths: ['scripts/governance'] } },
}));

const mockAnalyzeImports = vi.mocked(DependencyAnalyzerModule.DependencyAnalyzer.analyzeImports);

describe('CircularImportValidator', () => {
  let validator: CircularImportValidator;

  beforeEach(() => {
    validator = new CircularImportValidator();
    vi.clearAllMocks();
  });

  it('should pass when no cycles exist', async () => {
    mockAnalyzeImports.mockImplementation((file) => {
      if (file === 'apps/web/src/a.ts') return ['apps/web/src/b.ts'];
      return [];
    });

    const result = await validator.run(
      ['apps/web/src/a.ts', 'apps/web/src/b.ts'],
      {}
    );

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should report CRITICAL for a direct cross-package cycle', async () => {
    // apps/web → packages/ui → apps/web
    mockAnalyzeImports.mockImplementation((file) => {
      if (file === 'apps/web/src/a.ts') return ['packages/ui/src/b.ts'];
      if (file === 'packages/ui/src/b.ts') return ['apps/web/src/a.ts'];
      return [];
    });

    const result = await validator.run(
      ['apps/web/src/a.ts', 'packages/ui/src/b.ts'],
      {}
    );

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].rule).toBe('VAL-ARC-005');
    expect(result.errors[0].severity).toBe('CRITICAL');
    expect(result.errors[0].message).toContain('CROSS-PACKAGE');
  });

  it('should report WARNING for an intra-package cycle', async () => {
    // apps/web/src/a → apps/web/src/b → apps/web/src/a
    mockAnalyzeImports.mockImplementation((file) => {
      if (file === 'apps/web/src/a.ts') return ['apps/web/src/b.ts'];
      if (file === 'apps/web/src/b.ts') return ['apps/web/src/a.ts'];
      return [];
    });

    const result = await validator.run(
      ['apps/web/src/a.ts', 'apps/web/src/b.ts'],
      {}
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].rule).toBe('VAL-ARC-005b');
    expect(result.warnings[0].severity).toBe('WARNING');
    expect(result.warnings[0].message).toContain('INTERNAL');
  });

  it('should detect an indirect three-node cross-package cycle', async () => {
    // apps/web/src/a → packages/ui/src/b → packages/shared/src/c → apps/web/src/a
    mockAnalyzeImports.mockImplementation((file) => {
      if (file === 'apps/web/src/a.ts') return ['packages/ui/src/b.ts'];
      if (file === 'packages/ui/src/b.ts') return ['packages/shared/src/c.ts'];
      if (file === 'packages/shared/src/c.ts') return ['apps/web/src/a.ts'];
      return [];
    });

    const result = await validator.run(
      ['apps/web/src/a.ts', 'packages/ui/src/b.ts', 'packages/shared/src/c.ts'],
      {}
    );

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].rule).toBe('VAL-ARC-005');
  });

  it('should ignore files in excluded paths', async () => {
    mockAnalyzeImports.mockReturnValue([]);

    const result = await validator.run(
      ['scripts/governance/validators/some_validator.ts'],
      {}
    );

    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.statistics.filesScanned).toBe(0);
  });

  it('should deduplicate symmetric cycles', async () => {
    // A→B→A and B→A→B are the same cycle
    mockAnalyzeImports.mockImplementation((file) => {
      if (file === 'apps/web/src/a.ts') return ['apps/web/src/b.ts'];
      if (file === 'apps/web/src/b.ts') return ['apps/web/src/a.ts'];
      return [];
    });

    const result = await validator.run(
      ['apps/web/src/a.ts', 'apps/web/src/b.ts'],
      {}
    );

    // Only one cycle finding despite starting from two files
    expect(result.warnings.length + result.errors.length).toBe(1);
  });
});
