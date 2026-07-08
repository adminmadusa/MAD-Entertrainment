import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { TrailingWhitespaceFixer } from '../fixers/trailing_whitespace_fixer';
import { EofNewlineFixer } from '../fixers/eof_newline_fixer';
import { BlankLineFixer } from '../fixers/blank_line_fixer';
import { DuplicateImportFixer } from '../fixers/duplicate_import_fixer';
import { ImportOrderFixer } from '../fixers/import_order_fixer';
import { TypeImportFixer } from '../fixers/type_import_fixer';
import { FixContext } from '../fix_context';
import { StatelessViolation } from '../types';
import * as ts from 'typescript';
import { ASTParserCache } from '../ast_parser_cache';

const workspaceRoot = resolve(__dirname, '../../../..');
const sandboxDir = join(workspaceRoot, 'scratch/hygiene-fix-tests');
const relativeSandboxPath = 'scratch/hygiene-fix-tests';

describe('Repository Hygiene Fixers', () => {
  let context: FixContext;

  beforeEach(() => {
    context = new FixContext({ workspaceRoot });
    ASTParserCache.getSourceFile(''); // Clear AST cache

    if (existsSync(sandboxDir)) {
      rmSync(sandboxDir, { recursive: true, force: true });
    }
    mkdirSync(sandboxDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(sandboxDir)) {
      rmSync(sandboxDir, { recursive: true, force: true });
    }
  });

  describe('TrailingWhitespaceFixer', () => {
    it('should strip trailing spaces and tabs', async () => {
      const file = join(relativeSandboxPath, 'whitespace.md');
      const full = join(workspaceRoot, file);
      writeFileSync(full, 'Line 1   \nLine 2\t\nLine 3\n', 'utf8');

      const fixer = new TrailingWhitespaceFixer();
      const violation: StatelessViolation = {
        rule: 'VAL-HYG-004',
        path: file,
        message: 'Trailing whitespace',
      };

      const result = await fixer.fix(violation, context);
      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      expect(result.fixedContent).toBe('Line 1\nLine 2\nLine 3\n');
    });

    it('should return applied: false if no trailing whitespace exists', async () => {
      const file = join(relativeSandboxPath, 'whitespace.md');
      const full = join(workspaceRoot, file);
      writeFileSync(full, 'Line 1\nLine 2\n', 'utf8');

      const fixer = new TrailingWhitespaceFixer();
      const violation: StatelessViolation = {
        rule: 'VAL-HYG-004',
        path: file,
        message: 'Trailing whitespace',
      };

      const result = await fixer.fix(violation, context);
      expect(result.success).toBe(true);
      expect(result.applied).toBe(false);
    });
  });

  describe('EofNewlineFixer', () => {
    it('should add a trailing newline if missing', async () => {
      const file = join(relativeSandboxPath, 'eof.md');
      const full = join(workspaceRoot, file);
      writeFileSync(full, 'Content no newline', 'utf8');

      const fixer = new EofNewlineFixer();
      const violation: StatelessViolation = {
        rule: 'VAL-HYG-005',
        path: file,
        message: 'Missing EOF newline',
      };

      const result = await fixer.fix(violation, context);
      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      expect(result.fixedContent).toBe('Content no newline\n');
    });

    it('should trim excessive trailing newlines to exactly one', async () => {
      const file = join(relativeSandboxPath, 'eof.md');
      const full = join(workspaceRoot, file);
      writeFileSync(full, 'Content excessive newlines\n\n\n', 'utf8');

      const fixer = new EofNewlineFixer();
      const violation: StatelessViolation = {
        rule: 'VAL-HYG-005',
        path: file,
        message: 'Excessive EOF newlines',
      };

      const result = await fixer.fix(violation, context);
      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      expect(result.fixedContent).toBe('Content excessive newlines\n');
    });
  });

  describe('BlankLineFixer', () => {
    it('should collapse three or more consecutive blank lines in normal text', async () => {
      const file = join(relativeSandboxPath, 'blank.md');
      const full = join(workspaceRoot, file);
      writeFileSync(full, 'Line 1\n\n\n\nLine 5\n', 'utf8');

      const fixer = new BlankLineFixer();
      const violation: StatelessViolation = {
        rule: 'VAL-HYG-006',
        path: file,
        message: 'Excessive blank lines',
      };

      const result = await fixer.fix(violation, context);
      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      expect(result.fixedContent).toBe('Line 1\n\nLine 5\n');
    });

    it('should bypass blank lines inside markdown code fences', async () => {
      const file = join(relativeSandboxPath, 'blank.md');
      const full = join(workspaceRoot, file);
      writeFileSync(full, 'Line 1\n```js\n\n\n\nconsole.log(1);\n```\nLine 7\n', 'utf8');

      const fixer = new BlankLineFixer();
      const violation: StatelessViolation = {
        rule: 'VAL-HYG-006',
        path: file,
        message: 'Excessive blank lines',
      };

      const result = await fixer.fix(violation, context);
      expect(result.success).toBe(true);
      expect(result.applied).toBe(false); // No-op as the blank lines are in a fenced block
    });
  });

  describe('DuplicateImportFixer', () => {
    it('should merge duplicate named imports from the same module path', async () => {
      const file = join(relativeSandboxPath, 'dup-imports.ts');
      const full = join(workspaceRoot, file);
      const code = `import { A } from './module';\nimport { B } from './module';\n`;
      writeFileSync(full, code, 'utf8');

      // Setup ASTParserCache manually for tests to resolve sandbox paths
      ASTParserCache.getSourceFile = (f: string) => {
        if (f === file) {
          return ts.createSourceFile(f, code, ts.ScriptTarget.ESNext, true);
        }
        return null;
      };

      const fixer = new DuplicateImportFixer();
      const violation: StatelessViolation = {
        rule: 'VAL-HYG-002',
        path: file,
        message: 'Duplicate imports',
      };

      const result = await fixer.fix(violation, context);
      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      expect(result.fixedContent).toBe("import { A, B } from './module';\n");
    });

    it('should bypass duplicate import merges when containing default imports', async () => {
      const file = join(relativeSandboxPath, 'dup-imports.ts');
      const full = join(workspaceRoot, file);
      const code = `import A from './module';\nimport { B } from './module';\n`;
      writeFileSync(full, code, 'utf8');

      ASTParserCache.getSourceFile = (f: string) => {
        if (f === file) {
          return ts.createSourceFile(f, code, ts.ScriptTarget.ESNext, true);
        }
        return null;
      };

      const fixer = new DuplicateImportFixer();
      const violation: StatelessViolation = {
        rule: 'VAL-HYG-002',
        path: file,
        message: 'Duplicate imports',
      };

      const result = await fixer.fix(violation, context);
      expect(result.success).toBe(true);
      expect(result.applied).toBe(false);
    });

    it('should bypass duplicate import merges when alias conflicts exist', async () => {
      const file = join(relativeSandboxPath, 'dup-imports.ts');
      const full = join(workspaceRoot, file);
      const code = `import { A as B } from './module';\nimport { A as C } from './module';\n`;
      writeFileSync(full, code, 'utf8');

      ASTParserCache.getSourceFile = (f: string) => {
        if (f === file) {
          return ts.createSourceFile(f, code, ts.ScriptTarget.ESNext, true);
        }
        return null;
      };

      const fixer = new DuplicateImportFixer();
      const violation: StatelessViolation = {
        rule: 'VAL-HYG-002',
        path: file,
        message: 'Duplicate imports',
      };

      const result = await fixer.fix(violation, context);
      expect(result.success).toBe(true);
      expect(result.applied).toBe(false);
    });
  });

  describe('Manual Safety Fixers', () => {
    it('should skip ImportOrderFixer and TypeImportFixer', async () => {
      const orderFixer = new ImportOrderFixer();
      const typeFixer = new TypeImportFixer();

      const violation: StatelessViolation = {
        rule: 'VAL-HYG-001',
        path: 'dummy.ts',
        message: 'Manual review required',
      };

      const res1 = await orderFixer.fix(violation, context);
      expect(res1.success).toBe(false);
      expect(res1.applied).toBe(false);
      expect(res1.safety).toBe('MANUAL');

      const res2 = await typeFixer.fix(violation, context);
      expect(res2.success).toBe(false);
      expect(res2.applied).toBe(false);
      expect(res2.safety).toBe('MANUAL');
    });
  });
});
