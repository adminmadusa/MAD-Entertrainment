import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import { FileContentCache, ASTParserCache } from '../ast_parser_cache';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe('AST and File Content Cache Framework', () => {
  beforeEach(() => {
    FileContentCache.clear();
    ASTParserCache.clear();
    vi.clearAllMocks();
  });

  describe('FileContentCache', () => {
    it('should read file from disk exactly once and reuse it', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('file-content-sample');

      const content1 = FileContentCache.getFileContent('test-file.ts');
      const content2 = FileContentCache.getFileContent('test-file.ts');

      expect(content1).toBe('file-content-sample');
      expect(content2).toBe('file-content-sample');
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);

      const metrics = FileContentCache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
    });

    it('should handle non-existent files gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const content = FileContentCache.getFileContent('non-existent.ts');
      expect(content).toBeNull();
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });
  });

  describe('ASTParserCache', () => {
    it('should parse source files exactly once and reuse the parsed AST', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('export const a = 42;');

      const ast1 = ASTParserCache.getSourceFile('test-file.ts');
      const ast2 = ASTParserCache.getSourceFile('test-file.ts');

      expect(ast1).toBeDefined();
      expect(ast2).toBeDefined();
      expect(ast1).toBe(ast2); // Reference identity equality!

      const metrics = ASTParserCache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
    });
  });
});
