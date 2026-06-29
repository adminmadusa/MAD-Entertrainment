// scripts/governance/core/dependency_analyzer.ts
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join, relative } from 'path';

export class DependencyAnalyzer {
  private static workspaceRoot = resolve(__dirname, '../../..');

  /**
   * Resolves an import source string to a relative workspace path.
   */
  public static resolveImport(importPath: string, currentFile: string): string | null {
    try {
      const currentDir = dirname(resolve(this.workspaceRoot, currentFile));

      // 1. Resolve relative imports (e.g., './Button', '../utils')
      if (importPath.startsWith('.')) {
        const absoluteImport = resolve(currentDir, importPath);
        return this.findFileWithExtension(absoluteImport);
      }

      // 2. Resolve monorepo alias types (e.g., '@mad/ui', '@mad/shared')
      if (importPath.startsWith('@mad/')) {
        const pkgName = importPath.substring(5); // e.g. 'ui'
        const absoluteImport = resolve(this.workspaceRoot, `packages/${pkgName}/src`);
        return this.findFileWithExtension(absoluteImport);
      }

      // 3. Resolve app-specific alias types (e.g. '@/components/ui')
      if (importPath.startsWith('@/')) {
        const remaining = importPath.substring(2);
        let appPrefix = 'apps/web/src';
        if (currentFile.includes('apps/admin/')) {
          appPrefix = 'apps/admin/src';
        } else if (currentFile.includes('apps/server/')) {
          appPrefix = 'apps/server/src';
        }
        const absoluteImport = resolve(this.workspaceRoot, appPrefix, remaining);
        return this.findFileWithExtension(absoluteImport);
      }
    } catch (e) {
      // Failed to resolve path
    }
    return null;
  }

  private static findFileWithExtension(basePath: string): string | null {
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
    if (existsSync(basePath) && !statSyncIsDir(basePath)) {
      return relative(this.workspaceRoot, basePath);
    }
    for (const ext of extensions) {
      const fullPath = basePath + ext;
      if (existsSync(fullPath)) {
        return relative(this.workspaceRoot, fullPath);
      }
    }
    return null;
  }

  /**
   * Extract all local relative imports from a typescript source file.
   */
  public static analyzeImports(filePath: string): string[] {
    const resolvedPath = resolve(this.workspaceRoot, filePath);
    if (!existsSync(resolvedPath)) return [];

    const content = readFileSync(resolvedPath, 'utf8');
    const imports: string[] = [];

    // Regex to match ES6 import / export from syntax
    const importRegex = /(?:import|export)\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const source = match[1];
      const resolved = this.resolveImport(source, filePath);
      if (resolved) {
        imports.push(resolved);
      }
    }

    return Array.from(new Set(imports));
  }
}

// Simple fs.stat helper to avoid circular dependency
function statSyncIsDir(path: string): boolean {
  const { statSync } = require('fs');
  try {
    return statSync(path).isDirectory();
  } catch (e) {
    return false;
  }
}
export const dependencyAnalyzerVersion = '1.0.0';
