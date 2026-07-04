import { describe, it, expect } from 'vitest';
import { fixerRegistry } from '../base/registry';
import { FixRunner } from '../base/runner';
import { rollbackManager } from '../engines/rollback-manager';
import { PatchGenerator } from '../engines/patch-generator';
import { FormatterEngine } from '../engines/formatter';
import { ImportManager } from '../engines/import-manager';
import { TypeScriptFixer } from '../fixers/typescript/fixer';
import { ReactFixer } from '../fixers/react/fixer';
import { NextjsFixer } from '../fixers/nextjs/fixer';
import { NodeFixer } from '../fixers/node/fixer';
import { DatabaseFixer } from '../fixers/database/fixer';
import { SecurityFixer } from '../fixers/security/fixer';
import { AccessibilityFixer } from '../fixers/accessibility/fixer';
import { DocumentationFixer } from '../fixers/documentation/fixer';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

// Ensure fixers are registered
import '../fixers/typescript/fixer';
import '../fixers/react/fixer';
import '../fixers/nextjs/fixer';
import '../fixers/node/fixer';
import '../fixers/database/fixer';
import '../fixers/security/fixer';
import '../fixers/accessibility/fixer';
import '../fixers/documentation/fixer';

describe('AI OS Executable Auto-Fix Engine Suites', () => {
  it('should successfully register fixers into registry', () => {
    const list = fixerRegistry.list();
    expect(list.length).toBeGreaterThan(0);
    const tsFixer = fixerRegistry.get('TS-001');
    expect(tsFixer).toBeDefined();
    expect(tsFixer?.title).toBe('TypeScript Type Annotations Fixer');
  });

  it('should generate patches with unified diff representation', () => {
    const generator = new PatchGenerator();
    const patch = {
      id: 'pat_1',
      file: 'types.ts',
      original: 'const x: any = 1;',
      replacement: 'const x: unknown = 1;',
      lineStart: 5,
      lineEnd: 5,
      confidence: 1.0,
      validatorId: 'VAL-TS-001'
    };
    const diff = generator.generateUnifiedDiff(patch);
    expect(diff).toContain('--- types.ts');
    expect(diff).toContain('+ const x: unknown = 1;');
  });

  it('should format code blocks and normalize whitespaces', () => {
    const formatter = new FormatterEngine();
    const formatted = formatter.format('  code\r\n');
    expect(formatted).toBe('code\n');
  });

  it('should sort imports in code string topologically', () => {
    const manager = new ImportManager();
    const code = `const y = 2;\nimport B from 'b';\nimport A from 'a';`;
    const sorted = manager.sortImports(code);
    expect(sorted.indexOf("import A")).toBeLessThan(sorted.indexOf("import B"));
  });

  it('should successfully backup and rollback files updates', async () => {
    const testFile = join(process.cwd(), 'scratch/rollback_test.txt');
    writeFileSync(testFile, 'initial', 'utf8');

    rollbackManager.backup('pat_roll', testFile, 'initial');
    writeFileSync(testFile, 'updated', 'utf8');
    expect(readFileSync(testFile, 'utf8')).toBe('updated');

    const res = await rollbackManager.rollback('pat_roll');
    expect(res.success).toBe(true);
    expect(readFileSync(testFile, 'utf8')).toBe('initial');
  });

  it('should execute dry-runs without changing file content', async () => {
    const testFile = join(process.cwd(), 'scratch/dryrun_test.txt');
    writeFileSync(testFile, 'const val: any = 1;', 'utf8');

    const runner = new FixRunner();
    const results = await runner.runFixes({
      repoRoot: process.cwd(),
      findings: [{
        ruleId: 'TS-001',
        severity: 'high',
        file: testFile,
        line: 1,
        evidence: 'explicit any',
        recommendation: 'Fix it'
      }],
      dryRun: true
    });

    expect(results.length).toBe(1);
    expect(results[0].success).toBe(true);
    expect(readFileSync(testFile, 'utf8')).toBe('const val: any = 1;');
  });
});
