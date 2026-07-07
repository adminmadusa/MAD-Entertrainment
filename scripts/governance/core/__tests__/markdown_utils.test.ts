import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { parseLinksFromLine, checkPathCasing } from '../markdown_utils';

const workspaceRoot = resolve(__dirname, '../../../..');
const sandboxDir = join(workspaceRoot, 'scratch/markdown-utils-tests');
const relativeSandboxPath = 'scratch/markdown-utils-tests';

describe('Markdown Utilities', () => {
  describe('parseLinksFromLine', () => {
    it('should parse inline links correctly', () => {
      const line = 'Check this [Link Label](path/to/file.md) and [another](other.md).';
      const parsed = parseLinksFromLine(line);
      expect(parsed).toEqual([
        { type: 'inline', label: 'Link Label', urlOrRef: 'path/to/file.md' },
        { type: 'inline', label: 'another', urlOrRef: 'other.md' },
      ]);
    });

    it('should parse reference links correctly', () => {
      const line = 'Refer to [Link Label][ref-id] or shorthand [shorthand-ref].';
      const parsed = parseLinksFromLine(line);
      expect(parsed).toEqual([
        { type: 'reference', label: 'Link Label', urlOrRef: 'ref-id' },
        { type: 'reference', label: 'shorthand-ref', urlOrRef: 'shorthand-ref' },
      ]);
    });

    it('should support links with anchors', () => {
      const line = 'Read [Rules](docs/AGENTS.md#rules) here.';
      const parsed = parseLinksFromLine(line);
      expect(parsed).toEqual([
        { type: 'inline', label: 'Rules', urlOrRef: 'docs/AGENTS.md#rules' },
      ]);
    });

    it('should ignore text inside inline code or backticks', () => {
      // The validator splits/ignores inCodeBlock, but links inside code snippets on normal lines are parsed
      const line = 'Do not follow `[escaped](link)` here.';
      const parsed = parseLinksFromLine(line);
      expect(parsed).toEqual([
        { type: 'inline', label: 'escaped', urlOrRef: 'link' },
      ]);
    });

    it('should parse balanced brackets inside labels (e.g. Next.js router groups)', () => {
      const line = 'Balanced [Label [Nested]](target.md)';
      const parsed = parseLinksFromLine(line);
      expect(parsed).toEqual([
        { type: 'inline', label: 'Label [Nested]', urlOrRef: 'target.md' },
      ]);
    });
  });

  describe('checkPathCasing', () => {
    beforeEach(() => {
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

    it('should find exact case match files', () => {
      const filePath = join(sandboxDir, 'exactFile.md');
      writeFileSync(filePath, 'content', 'utf8');

      const result = checkPathCasing(workspaceRoot, join(relativeSandboxPath, 'exactFile.md'));
      expect(result.status).toBe('FOUND');
      expect(result.canonicalPath?.replace(/\\/g, '/')).toBe(`${relativeSandboxPath}/exactFile.md`);
    });

    it('should identify case mismatch files and return canonical path', () => {
      const filePath = join(sandboxDir, 'EXACTFILE.md');
      writeFileSync(filePath, 'content', 'utf8');

      const result = checkPathCasing(workspaceRoot, join(relativeSandboxPath, 'exactfile.md'));
      expect(result.status).toBe('CASE_MISMATCH');
      expect(result.canonicalPath?.replace(/\\/g, '/')).toBe(`${relativeSandboxPath}/EXACTFILE.md`);
    });

    it('should return NOT_FOUND for non-existent files', () => {
      const result = checkPathCasing(workspaceRoot, join(relativeSandboxPath, 'doesNotExist.md'));
      expect(result.status).toBe('NOT_FOUND');
    });
  });
});
