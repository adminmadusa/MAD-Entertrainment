import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { RepositoryHygieneValidator } from './repository_hygiene_validator';
import { FileContentCache, ASTParserCache } from '../core/ast_parser_cache';

const workspaceRoot = resolve(__dirname, '../../..');
const sandboxDir = join(workspaceRoot, 'scratch/hygiene-tests');
const relativeSandboxPath = 'scratch/hygiene-tests';

describe('RepositoryHygieneValidator', () => {
  let validator: RepositoryHygieneValidator;

  beforeEach(() => {
    validator = new RepositoryHygieneValidator();
    FileContentCache.clear();
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

  describe('Text-Based Rules', () => {
    it('should flag trailing whitespace (VAL-HYG-004)', async () => {
      const file = join(relativeSandboxPath, 'whitespace.md');
      const full = join(workspaceRoot, file);
      writeFileSync(full, 'Line 1 \nLine 2\t\nLine 3\n', 'utf8');

      const res = await validator.run([file], { requiredDocuments: [], ownershipMatrix: [] });
      expect(res.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ file, rule: 'VAL-HYG-004', line: 1 }),
          expect.objectContaining({ file, rule: 'VAL-HYG-004', line: 2 }),
        ])
      );
    });

    it('should flag missing or excessive EOF newlines (VAL-HYG-005)', async () => {
      const file1 = join(relativeSandboxPath, 'missing-eof.md');
      const full1 = join(workspaceRoot, file1);
      writeFileSync(full1, 'No newline at EOF', 'utf8');

      const file2 = join(relativeSandboxPath, 'double-eof.md');
      const full2 = join(workspaceRoot, file2);
      writeFileSync(full2, 'Two newlines at EOF\n\n', 'utf8');

      const res1 = await validator.run([file1], { requiredDocuments: [], ownershipMatrix: [] });
      expect(res1.warnings).toContainEqual(
        expect.objectContaining({ file: file1, rule: 'VAL-HYG-005' })
      );

      const res2 = await validator.run([file2], { requiredDocuments: [], ownershipMatrix: [] });
      expect(res2.warnings).toContainEqual(
        expect.objectContaining({ file: file2, rule: 'VAL-HYG-005' })
      );
    });

    it('should flag excessive blank lines (VAL-HYG-006)', async () => {
      const file = join(relativeSandboxPath, 'excessive-blank.md');
      const full = join(workspaceRoot, file);
      writeFileSync(full, 'Line 1\n\n\n\nLine 5\n', 'utf8');

      const res = await validator.run([file], { requiredDocuments: [], ownershipMatrix: [] });
      expect(res.warnings).toContainEqual(
        expect.objectContaining({ file, rule: 'VAL-HYG-006', line: 2 })
      );
    });
  });

  describe('AST-Based Rules', () => {
    it('should flag duplicate imports (VAL-HYG-002)', async () => {
      const file = join(relativeSandboxPath, 'dup-imports.ts');
      const full = join(workspaceRoot, file);
      const code = `import { A } from './module';\nimport { B } from './module';\n`;
      writeFileSync(full, code, 'utf8');

      const res = await validator.run([file], { requiredDocuments: [], ownershipMatrix: [] });
      expect(res.errors).toContainEqual(
        expect.objectContaining({ file, rule: 'VAL-HYG-002', line: 2 })
      );
    });

    it('should flag type-only imports lacking the type keyword (VAL-HYG-003)', async () => {
      const file = join(relativeSandboxPath, 'type-import.ts');
      const full = join(workspaceRoot, file);
      const code = `import { User } from './types';\n`;
      writeFileSync(full, code, 'utf8');

      const res = await validator.run([file], { requiredDocuments: [], ownershipMatrix: [] });
      expect(res.warnings).toContainEqual(
        expect.objectContaining({ file, rule: 'VAL-HYG-003', line: 1 })
      );
    });

    it('should flag imports with incorrect grouping or ordering (VAL-HYG-001)', async () => {
      const file = join(relativeSandboxPath, 'order-import.ts');
      const full = join(workspaceRoot, file);
      // Relative import placed before third-party import
      const code = `import { Relative } from './relative';\nimport { ThirdParty } from 'third-party';\n`;
      writeFileSync(full, code, 'utf8');

      const res = await validator.run([file], { requiredDocuments: [], ownershipMatrix: [] });
      expect(res.warnings).toContainEqual(
        expect.objectContaining({ file, rule: 'VAL-HYG-001' })
      );
    });

    it('should flag imports without a separating blank line (VAL-HYG-001)', async () => {
      const file = join(relativeSandboxPath, 'blank-import.ts');
      const full = join(workspaceRoot, file);
      // Builtin directly followed by third-party (no blank line separator)
      const code = `import * as fs from 'fs';\nimport { ThirdParty } from 'third-party';\n`;
      writeFileSync(full, code, 'utf8');

      const res = await validator.run([file], { requiredDocuments: [], ownershipMatrix: [] });
      expect(res.warnings).toContainEqual(
        expect.objectContaining({ file, rule: 'VAL-HYG-001', line: 2 })
      );
    });

    it('should flag unsorted imports within the same group (VAL-HYG-001)', async () => {
      const file = join(relativeSandboxPath, 'unsorted-import.ts');
      const full = join(workspaceRoot, file);
      // Unsorted built-ins
      const code = `import * as path from 'path';\nimport * as fs from 'fs';\n`;
      writeFileSync(full, code, 'utf8');

      const res = await validator.run([file], { requiredDocuments: [], ownershipMatrix: [] });
      expect(res.warnings).toContainEqual(
        expect.objectContaining({ file, rule: 'VAL-HYG-001', line: 2 })
      );
    });
  });

  describe('Path Exclusions', () => {
    it('should ignore files in excluded directories (e.g. dist, .next)', async () => {
      const file = join(relativeSandboxPath, 'dist/ignored.ts');
      const full = join(workspaceRoot, file);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, 'Line with trailing whitespace \n', 'utf8');

      // We pass the relative file path dist/ignored.ts directly to simulate file selection
      const res = await validator.run(['dist/ignored.ts'], { requiredDocuments: [], ownershipMatrix: [] });
      expect(res.warnings.length).toBe(0);
      expect(res.errors.length).toBe(0);
    });

    it('should ignore generated or declaration files', async () => {
      const file1 = join(relativeSandboxPath, 'types.d.ts');
      const file2 = join(relativeSandboxPath, 'index.generated.ts');

      const full1 = join(workspaceRoot, file1);
      const full2 = join(workspaceRoot, file2);

      writeFileSync(full1, 'Line with trailing whitespace \n', 'utf8');
      writeFileSync(full2, 'Line with trailing whitespace \n', 'utf8');

      const res = await validator.run([file1, file2], { requiredDocuments: [], ownershipMatrix: [] });
      expect(res.warnings.length).toBe(0);
      expect(res.errors.length).toBe(0);
    });
  });
});
