import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { AutoFixEngine } from '../autofix_engine';
import { FixContext, FixLogger } from '../fix_context';
import { FixRegistry } from '../fix_registry';
import { Fixer, FixResultItem } from '../fix_types';
import { StatelessViolation } from '../types';
import { ExecutionEngine } from '../execution_engine';
import { RollbackManager } from '../rollback_manager';
import { FileWriter } from '../file_writer';

const workspaceRoot = resolve(__dirname, '../../../..');
const testSandboxDir = join(workspaceRoot, 'scratch/autofix-tests');
const relativeSandboxPath = 'scratch/autofix-tests';

class SimpleMockFixer implements Fixer {
  constructor(
    public readonly ruleId: string,
    public readonly safety: 'SAFE' | 'MANUAL' | 'UNSUPPORTED',
    public readonly behavior: 'success' | 'fail' | 'throw' = 'success',
    public readonly fixedValue: string = 'fixed value'
  ) {}

  async fix(violation: StatelessViolation, context: FixContext): Promise<FixResultItem> {
    if (this.behavior === 'throw') {
      throw new Error('Fixer execution failure');
    }

    if (this.behavior === 'fail') {
      return {
        ruleId: this.ruleId,
        filePath: violation.path,
        success: false,
        message: 'Could not apply fix',
        safety: this.safety,
        applied: false,
      };
    }

    return {
      ruleId: this.ruleId,
      filePath: violation.path,
      success: true,
      message: 'Fixed successfully',
      safety: this.safety,
      applied: true,
      originalContent: 'original content',
      fixedContent: this.fixedValue,
    };
  }
}

// Silence standard console logs during tests to keep output clean
const silentLogger: FixLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
};

describe('AutoFixEngine & Rollback Workflow', () => {
  beforeEach(() => {
    FixRegistry.clear();
    
    // Clean and recreate sandbox directory
    if (existsSync(testSandboxDir)) {
      rmSync(testSandboxDir, { recursive: true, force: true });
    }
    mkdirSync(testSandboxDir, { recursive: true });

    // Clean rollback backups directory
    const backupsDir = resolve(workspaceRoot, '.governance/autofix/backups');
    if (existsSync(backupsDir)) {
      rmSync(backupsDir, { recursive: true, force: true });
    }

    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (existsSync(testSandboxDir)) {
      rmSync(testSandboxDir, { recursive: true, force: true });
    }
    const backupsDir = resolve(workspaceRoot, '.governance/autofix/backups');
    if (existsSync(backupsDir)) {
      rmSync(backupsDir, { recursive: true, force: true });
    }
  });

  it('should successfully run a safe fix and write to disk', async () => {
    const file1 = join(relativeSandboxPath, 'file1.md');
    FileWriter.write(workspaceRoot, file1, 'original content');

    // Register a mock fixer
    FixRegistry.register(new SimpleMockFixer('VAL-DOC-001', 'SAFE', 'success', 'fixed content'));

    // Mock ExecutionEngine to return a violation in file1.md
    vi.spyOn(ExecutionEngine, 'execute').mockResolvedValue({
      results: [
        {
          name: 'DocumentationValidator',
          success: false,
          errors: [
            {
              file: file1,
              rule: 'VAL-DOC-001',
              severity: 'ERROR',
              message: 'Invalid header format',
            },
          ],
          warnings: [],
          statistics: {},
          executionTimeMs: 5,
        },
      ],
      metrics: [],
      totalExecutionTimeMs: 5,
    });

    const context = new FixContext({
      workspaceRoot,
      safeOnly: true,
      logger: silentLogger,
    });

    const result = await AutoFixEngine.execute(context);
    expect(result.stats.applied).toBe(1);
    expect(result.stats.errors).toBe(0);

    // Verify content on disk changed
    const updatedContent = readFileSync(join(workspaceRoot, file1), 'utf8');
    expect(updatedContent).toBe('fixed content');

    // Verify backup rollback file was created
    const backupsDir = resolve(workspaceRoot, '.governance/autofix/backups');
    const backups = readdirSync(backupsDir);
    expect(backups.length).toBe(1);
  });

  it('should support dry-run mode (not modifying disk, no backup written)', async () => {
    const file1 = join(relativeSandboxPath, 'file1.md');
    FileWriter.write(workspaceRoot, file1, 'original content');

    FixRegistry.register(new SimpleMockFixer('VAL-DOC-001', 'SAFE', 'success', 'fixed content'));

    vi.spyOn(ExecutionEngine, 'execute').mockResolvedValue({
      results: [
        {
          name: 'DocumentationValidator',
          success: false,
          errors: [
            {
              file: file1,
              rule: 'VAL-DOC-001',
              severity: 'ERROR',
              message: 'Invalid header format',
            },
          ],
          warnings: [],
          statistics: {},
          executionTimeMs: 5,
        },
      ],
      metrics: [],
      totalExecutionTimeMs: 5,
    });

    // Dry Run 1
    const context1 = new FixContext({
      workspaceRoot,
      dryRun: true,
      logger: silentLogger,
    });

    const result1 = await AutoFixEngine.execute(context1);
    expect(result1.stats.applied).toBe(1);
    expect(readFileSync(join(workspaceRoot, file1), 'utf8')).toBe('original content');

    // Dry Run 2 (Determinism Verification)
    const context2 = new FixContext({
      workspaceRoot,
      dryRun: true,
      logger: silentLogger,
    });

    const result2 = await AutoFixEngine.execute(context2);
    expect(result2.stats.applied).toBe(1);
    expect(result2.stats).toEqual(result1.stats);

    // Verify no rollback backup exists
    const backupsDir = resolve(workspaceRoot, '.governance/autofix/backups');
    const hasBackups = existsSync(backupsDir) && readdirSync(backupsDir).length > 0;
    expect(hasBackups).toBe(false);
  });

  it('should support preview mode (not modifying disk)', async () => {
    const file1 = join(relativeSandboxPath, 'file1.md');
    FileWriter.write(workspaceRoot, file1, 'original content');

    FixRegistry.register(new SimpleMockFixer('VAL-DOC-001', 'SAFE', 'success', 'fixed content'));

    vi.spyOn(ExecutionEngine, 'execute').mockResolvedValue({
      results: [
        {
          name: 'DocumentationValidator',
          success: false,
          errors: [
            {
              file: file1,
              rule: 'VAL-DOC-001',
              severity: 'ERROR',
              message: 'Invalid header format',
            },
          ],
          warnings: [],
          statistics: {},
          executionTimeMs: 5,
        },
      ],
      metrics: [],
      totalExecutionTimeMs: 5,
    });

    const context = new FixContext({
      workspaceRoot,
      preview: true,
      logger: silentLogger,
    });

    const result = await AutoFixEngine.execute(context);
    expect(result.stats.applied).toBe(1);
    expect(readFileSync(join(workspaceRoot, file1), 'utf8')).toBe('original content');
  });

  it('should skip non-safe fixers if safe-only is enabled', async () => {
    const file1 = join(relativeSandboxPath, 'file1.md');
    FileWriter.write(workspaceRoot, file1, 'original content');

    FixRegistry.register(new SimpleMockFixer('VAL-DOC-001', 'MANUAL', 'success', 'fixed content'));

    vi.spyOn(ExecutionEngine, 'execute').mockResolvedValue({
      results: [
        {
          name: 'DocumentationValidator',
          success: false,
          errors: [
            {
              file: file1,
              rule: 'VAL-DOC-001',
              severity: 'ERROR',
              message: 'Manual intervention needed',
            },
          ],
          warnings: [],
          statistics: {},
          executionTimeMs: 5,
        },
      ],
      metrics: [],
      totalExecutionTimeMs: 5,
    });

    const context = new FixContext({
      workspaceRoot,
      safeOnly: true,
      logger: silentLogger,
    });

    const result = await AutoFixEngine.execute(context);
    expect(result.stats.applied).toBe(0);
    expect(result.stats.skipped).toBe(1);
    expect(readFileSync(join(workspaceRoot, file1), 'utf8')).toBe('original content');
  });

  it('should successfully save backup and perform byte-for-byte rollback restoration', async () => {
    const file1 = join(relativeSandboxPath, 'file1.md');
    FileWriter.write(workspaceRoot, file1, 'original content');

    FixRegistry.register(new SimpleMockFixer('VAL-DOC-001', 'SAFE', 'success', 'fixed content'));

    vi.spyOn(ExecutionEngine, 'execute').mockResolvedValue({
      results: [
        {
          name: 'DocumentationValidator',
          success: false,
          errors: [
            {
              file: file1,
              rule: 'VAL-DOC-001',
              severity: 'ERROR',
              message: 'Invalid header format',
            },
          ],
          warnings: [],
          statistics: {},
          executionTimeMs: 5,
        },
      ],
      metrics: [],
      totalExecutionTimeMs: 5,
    });

    // 1. Run fix to write files and create a rollback backup
    const context = new FixContext({
      workspaceRoot,
      logger: silentLogger,
    });
    await AutoFixEngine.execute(context);
    expect(readFileSync(join(workspaceRoot, file1), 'utf8')).toBe('fixed content');

    // 2. Perform Rollback
    const rollbackResult = RollbackManager.rollbackLatest(workspaceRoot);
    expect(rollbackResult.success).toBe(true);
    expect(rollbackResult.filesRestored).toEqual([file1]);

    // Check byte-for-byte match
    expect(readFileSync(join(workspaceRoot, file1), 'utf8')).toBe('original content');

    // 3. Consecutive rollback reports false/nothing without error
    const rollbackResult2 = RollbackManager.rollbackLatest(workspaceRoot);
    expect(rollbackResult2.success).toBe(false);
    expect(rollbackResult2.filesRestored).toEqual([]);
  });

  it('should reject rollback and write attempts outside workspace (directory traversal security check)', () => {
    expect(() => {
      FileWriter.write(workspaceRoot, '../../unsafe.md', 'content');
    }).toThrow('Security Violation: Attempted write outside workspace');
  });

  it('should preserve already-recorded original files if a fixer throws mid-run', async () => {
    const file1 = join(relativeSandboxPath, 'file1.md');
    const file2 = join(relativeSandboxPath, 'file2.md');
    FileWriter.write(workspaceRoot, file1, 'original content 1');
    FileWriter.write(workspaceRoot, file2, 'original content 2');

    // Register one successful fixer and one that throws
    FixRegistry.register(new SimpleMockFixer('VAL-DOC-001', 'SAFE', 'success', 'fixed content 1'));
    FixRegistry.register(new SimpleMockFixer('VAL-DOC-002', 'SAFE', 'throw'));

    vi.spyOn(ExecutionEngine, 'execute').mockResolvedValue({
      results: [
        {
          name: 'DocumentationValidator',
          success: false,
          errors: [
            {
              file: file1,
              rule: 'VAL-DOC-001',
              severity: 'ERROR',
              message: 'Invalid header 1',
            },
            {
              file: file2,
              rule: 'VAL-DOC-002',
              severity: 'ERROR',
              message: 'Invalid header 2',
            },
          ],
          warnings: [],
          statistics: {},
          executionTimeMs: 5,
        },
      ],
      metrics: [],
      totalExecutionTimeMs: 5,
    });

    const context = new FixContext({
      workspaceRoot,
      logger: silentLogger,
    });

    const result = await AutoFixEngine.execute(context);
    expect(result.stats.applied).toBe(1);
    expect(result.stats.errors).toBe(1);

    // Verify first file modified, second remains original
    expect(readFileSync(join(workspaceRoot, file1), 'utf8')).toBe('fixed content 1');
    expect(readFileSync(join(workspaceRoot, file2), 'utf8')).toBe('original content 2');

    // Verify a rollback session backup was STILL saved (containing file1's original state)
    const backupsDir = resolve(workspaceRoot, '.governance/autofix/backups');
    expect(readdirSync(backupsDir).length).toBe(1);

    // Verify rolling back restores files
    const rollback = RollbackManager.rollbackLatest(workspaceRoot);
    expect(rollback.success).toBe(true);
    expect(rollback.filesRestored.sort()).toEqual([file1, file2].sort());
    expect(readFileSync(join(workspaceRoot, file1), 'utf8')).toBe('original content 1');
  });

  it('should not save a rollback session file if no files are modified (no-op)', async () => {
    vi.spyOn(ExecutionEngine, 'execute').mockResolvedValue({
      results: [],
      metrics: [],
      totalExecutionTimeMs: 5,
    });

    const context = new FixContext({
      workspaceRoot,
      logger: silentLogger,
    });

    const result = await AutoFixEngine.execute(context);
    expect(result.stats.applied).toBe(0);

    const backupsDir = resolve(workspaceRoot, '.governance/autofix/backups');
    const hasBackups = existsSync(backupsDir) && readdirSync(backupsDir).length > 0;
    expect(hasBackups).toBe(false);
  });
});
