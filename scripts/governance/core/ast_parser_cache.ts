import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import * as ts from 'typescript';

const workspaceRoot = resolve(__dirname, '../../..');

export class FileContentCache {
  private static contentCache = new Map<string, string>();
  private static hitCount = 0;
  private static missCount = 0;

  public static getFileContent(file: string): string | null {
    const normalized = file.replace(/\\/g, '/');
    if (this.contentCache.has(normalized)) {
      this.hitCount++;
      return this.contentCache.get(normalized)!;
    }

    const fullPath = resolve(workspaceRoot, normalized);
    if (!existsSync(fullPath)) return null;

    try {
      const content = readFileSync(fullPath, 'utf8');
      this.contentCache.set(normalized, content);
      this.missCount++;
      return content;
    } catch (err) {
      return null;
    }
  }

  public static clear(): void {
    this.contentCache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  public static getMetrics() {
    return {
      hits: this.hitCount,
      misses: this.missCount,
    };
  }
}

export class ASTParserCache {
  private static astCache = new Map<string, ts.SourceFile>();
  private static hitCount = 0;
  private static missCount = 0;

  public static getSourceFile(file: string): ts.SourceFile | null {
    const normalized = file.replace(/\\/g, '/');
    if (this.astCache.has(normalized)) {
      this.hitCount++;
      return this.astCache.get(normalized)!;
    }

    const content = FileContentCache.getFileContent(normalized);
    if (content === null) return null;

    const fullPath = resolve(workspaceRoot, normalized);
    try {
      const sourceFile = ts.createSourceFile(
        fullPath,
        content,
        ts.ScriptTarget.Latest,
        true
      );
      this.astCache.set(normalized, sourceFile);
      this.missCount++;
      return sourceFile;
    } catch (err) {
      return null;
    }
  }

  public static clear(): void {
    this.astCache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  public static getMetrics() {
    return {
      hits: this.hitCount,
      misses: this.missCount,
    };
  }
}
