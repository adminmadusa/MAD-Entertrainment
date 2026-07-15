// scripts/governance/validators/todo_inventory_validator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TodoInventoryValidator } from './todo_inventory_validator';

vi.mock('../core/ast_parser_cache', () => ({
  FileContentCache: {
    getFileContent: vi.fn(),
  },
}));

vi.mock('../core/governance.config', () => ({
  governanceConfig: { scanScope: { excludedPaths: ['scripts/governance'] } },
}));

import { FileContentCache } from '../core/ast_parser_cache';
const mockGetFileContent = vi.mocked(FileContentCache.getFileContent);

describe('TodoInventoryValidator', () => {
  let validator: TodoInventoryValidator;

  beforeEach(() => {
    validator = new TodoInventoryValidator();
    vi.clearAllMocks();
  });

  it('should pass when all TODOs have a ticket reference', async () => {
    mockGetFileContent.mockReturnValue(`
// TODO(#123): fix the payment edge case
// FIXME(#456): remove this workaround after upgrade
const x = 1;
    `);

    const result = await validator.run(['apps/server/src/service.ts'], {});

    expect(result.success).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.statistics.documentedTodos).toBe(2);
  });

  it('should pass when TODO has owner attribution', async () => {
    mockGetFileContent.mockReturnValue(`
// TODO(@platform-team): refactor this once auth is migrated
    `);

    const result = await validator.run(['apps/server/src/service.ts'], {});

    expect(result.warnings).toHaveLength(0);
  });

  it('should pass when TODO has a Jira/Linear ticket reference', async () => {
    mockGetFileContent.mockReturnValue(`
// TODO(MAD-1234): migrate to new queue system
    `);

    const result = await validator.run(['apps/server/src/service.ts'], {});

    expect(result.warnings).toHaveLength(0);
  });

  it('should warn on bare TODO with no reference', async () => {
    mockGetFileContent.mockReturnValue(`
// TODO: fix this later
    `);

    const result = await validator.run(['apps/server/src/service.ts'], {});

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].rule).toBe('VAL-HYG-007');
    expect(result.warnings[0].severity).toBe('WARNING');
    expect(result.warnings[0].message).toContain('TODO');
  });

  it('should warn on bare FIXME', async () => {
    mockGetFileContent.mockReturnValue(`
// FIXME
    `);

    const result = await validator.run(['apps/server/src/service.ts'], {});

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].rule).toBe('VAL-HYG-007');
  });

  it('should warn on bare HACK comment', async () => {
    mockGetFileContent.mockReturnValue(`
// HACK: temporary workaround for now
    `);

    const result = await validator.run(['apps/server/src/service.ts'], {});

    expect(result.warnings).toHaveLength(1);
  });

  it('should NOT warn on XXXXX booking reference placeholders', async () => {
    // These are format strings in documentation, not technical debt
    mockGetFileContent.mockReturnValue(`
// Format: MAD-YYYY-XXXXX
const ref = 'MAD-2026-XXXXX';
placeholder = 'TKT-XXXX-XXX...';
    `);

    const result = await validator.run(['apps/server/src/schemas.ts'], {});

    // XXXXX is not preceded by // TODO/FIXME/HACK/XXX comment marker
    expect(result.warnings).toHaveLength(0);
  });

  it('should not fail CI (Phase 1 — success is always true)', async () => {
    mockGetFileContent.mockReturnValue(`
// TODO: undocumented technical debt
// FIXME: another undocumented item
    `);

    const result = await validator.run(['apps/server/src/service.ts'], {});

    // Phase 1: always succeeds — never blocks CI
    expect(result.success).toBe(true);
    expect(result.warnings).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should exclude test files', async () => {
    mockGetFileContent.mockReturnValue(`// TODO: undocumented`);

    const result = await validator.run(
      ['apps/server/src/service.test.ts'],
      {}
    );

    expect(result.warnings).toHaveLength(0);
    expect(result.statistics.filesScanned).toBe(0);
  });

  it('should exclude files in excluded paths', async () => {
    mockGetFileContent.mockReturnValue(`// TODO: undocumented`);

    const result = await validator.run(
      ['scripts/governance/validators/some_validator.ts'],
      {}
    );

    expect(result.warnings).toHaveLength(0);
  });

  it('should report the correct line number', async () => {
    mockGetFileContent.mockReturnValue(`const a = 1;
const b = 2;
// TODO: fix this
const c = 3;`);

    const result = await validator.run(['apps/web/src/component.ts'], {});

    expect(result.warnings[0].line).toBe(3);
  });
});
