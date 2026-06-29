// scripts/governance/core/dependency_analyzer.ts
import { readFileSync, existsSync, statSync } from 'fs';
import { resolve, dirname, join, relative } from 'path';
import * as ts from 'typescript';
import { governanceConfig } from './governance.config';

export interface AnalysisResult {
  dependencies: string[];
  exports: string[];
  dynamicImports: string[];
  assetReferences: string[];
}

interface PathAlias {
  prefix: string;
  targets: string[];
  baseDir: string;
}

class PathResolver {
  private static aliasesMap = new Map<string, PathAlias[]>();

  public static loadAliasesForFile(currentFile: string, workspaceRoot: string): PathAlias[] {
    let tsconfigPath = resolve(workspaceRoot, 'tsconfig.base.json');
    if (currentFile.startsWith('apps/web/')) {
      tsconfigPath = resolve(workspaceRoot, 'apps/web/tsconfig.json');
    } else if (currentFile.startsWith('apps/admin/')) {
      tsconfigPath = resolve(workspaceRoot, 'apps/admin/tsconfig.json');
    } else if (currentFile.startsWith('apps/server/')) {
      tsconfigPath = resolve(workspaceRoot, 'apps/server/tsconfig.json');
    }

    if (this.aliasesMap.has(tsconfigPath)) {
      return this.aliasesMap.get(tsconfigPath)!;
    }

    const aliases = this.parseTsconfig(tsconfigPath, workspaceRoot);
    this.aliasesMap.set(tsconfigPath, aliases);
    return aliases;
  }

  private static parseTsconfig(filePath: string, workspaceRoot: string): PathAlias[] {
    const aliases: PathAlias[] = [];
    if (!existsSync(filePath)) return aliases;

    try {
      const result = ts.readConfigFile(filePath, ts.sys.readFile);
      if (result.error) return aliases;
      const json = result.config;

      const baseDir = dirname(filePath);

      if (json.compilerOptions && json.compilerOptions.paths) {
        const pathsObj = json.compilerOptions.paths;
        for (const [key, val] of Object.entries(pathsObj)) {
          if (Array.isArray(val)) {
            aliases.push({
              prefix: key,
              targets: val,
              baseDir,
            });
          }
        }
      }

      if (json.extends) {
        const extendsPath = resolve(baseDir, json.extends);
        const baseAliases = this.parseTsconfig(extendsPath, workspaceRoot);
        aliases.push(...baseAliases);
      }
    } catch (e) {
      // Ignored
    }
    return aliases;
  }
}

export class DependencyAnalyzer {
  private static workspaceRoot = resolve(__dirname, '../../..');
  private static warnings: { file: string; message: string; line?: number }[] = [];

  public static getWarnings(): { file: string; message: string; line?: number }[] {
    return this.warnings;
  }

  public static clearWarnings(): void {
    this.warnings = [];
  }

  public static recordWarning(file: string, message: string, line?: number): void {
    this.warnings.push({ file, message, line });
  }

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

      // 2. Resolve Configurable Public Assets (e.g. '/images/logo.png')
      if (importPath.startsWith('/')) {
        const configDirs = (governanceConfig as any).publicAssetDirectories || {
          'apps/web/': 'apps/web/public',
          'apps/admin/': 'apps/admin/public',
        };

        let appPublic = '';
        for (const [appPrefix, publicDir] of Object.entries(configDirs)) {
          if (currentFile.startsWith(appPrefix)) {
            appPublic = publicDir as string;
            break;
          }
        }

        if (appPublic) {
          const absoluteImport = resolve(this.workspaceRoot, appPublic, importPath.substring(1));
          if (existsSync(absoluteImport)) {
            return relative(this.workspaceRoot, absoluteImport);
          }
        }
      }

      // 3. Resolve TSConfig path aliases (e.g. '@mad/ui', '@/components')
      const aliases = PathResolver.loadAliasesForFile(currentFile, this.workspaceRoot);
      for (const alias of aliases) {
        if (alias.prefix === importPath) {
          for (const target of alias.targets) {
            const abs = resolve(alias.baseDir, target);
            const resolved = this.findFileWithExtension(abs);
            if (resolved) return resolved;
          }
        } else if (alias.prefix.endsWith('*')) {
          const prefixKey = alias.prefix.slice(0, -1);
          if (importPath.startsWith(prefixKey)) {
            const matchPart = importPath.substring(prefixKey.length);
            for (const target of alias.targets) {
              const targetPath = target.replace('*', matchPart);
              const abs = resolve(alias.baseDir, targetPath);
              const resolved = this.findFileWithExtension(abs);
              if (resolved) return resolved;
            }
          }
        }
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
   * Extract all local relative imports from a source file.
   */
  public static analyzeImports(filePath: string): string[] {
    return this.analyzeFileDetailed(filePath).dependencies;
  }

  /**
   * Performs a comprehensive AST-based or lightweight scan of a file.
   */
  public static analyzeFileDetailed(filePath: string): AnalysisResult {
    const resolvedPath = resolve(this.workspaceRoot, filePath);
    const result: AnalysisResult = {
      dependencies: [],
      exports: [],
      dynamicImports: [],
      assetReferences: [],
    };

    if (!existsSync(resolvedPath)) return result;

    const ext = filePath.split('.').pop()?.toLowerCase();

    // 1. Process Stylesheets (CSS / SCSS)
    if (ext === 'css' || ext === 'scss') {
      try {
        const content = readFileSync(resolvedPath, 'utf8');
        const cssImportRegex = /@import\s+(?:url\()?['"]([^'"]+)['"]\)?/g;
        const cssUrlRegex = /url\(['"]?([^'")]+)['"]?\)/g;
        let match;

        while ((match = cssImportRegex.exec(content)) !== null) {
          const source = match[1];
          const resolved = this.resolveImport(source, filePath);
          if (resolved) {
            result.dependencies.push(resolved);
          }
        }

        while ((match = cssUrlRegex.exec(content)) !== null) {
          const url = match[1];
          if (/\.(png|jpg|jpeg|svg|webp)$/i.test(url)) {
            result.assetReferences.push(url);
            const resolved = this.resolveImport(url, filePath);
            if (resolved) {
              result.dependencies.push(resolved);
            }
          }
        }
      } catch (err) {
        // Safe skip on read errors
      }
      return result;
    }

    // 2. Process Markdown files
    if (ext === 'md') {
      try {
        const content = readFileSync(resolvedPath, 'utf8');
        const { extractLinks } = require('./metadata');
        const links = extractLinks(content, dirname(resolvedPath));
        for (const link of links) {
          const cleanPath = link.path.split('#')[0].trim();
          if (cleanPath) {
            result.dependencies.push(cleanPath);
            if (/\.(png|jpg|jpeg|svg|webp)$/i.test(cleanPath)) {
              result.assetReferences.push(cleanPath);
            }
          }
        }
      } catch (err) {
        // Safe skip on read errors
      }
      return result;
    }

    // 3. Process Configuration (JSON)
    if (ext === 'json') {
      try {
        const content = readFileSync(resolvedPath, 'utf8');
        const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
        const json = JSON.parse(cleanContent);

        // tsconfig reference matching
        if (json.references && Array.isArray(json.references)) {
          for (const ref of json.references) {
            if (ref.path) {
              const resolved = this.resolveImport(ref.path, filePath);
              if (resolved) {
                result.dependencies.push(resolved);
              }
            }
          }
        }
        if (json.extends) {
          const resolved = this.resolveImport(json.extends, filePath);
          if (resolved) {
            result.dependencies.push(resolved);
          }
        }
      } catch (err) {
        // Safe skip
      }
      return result;
    }

    // 4. Process Source Code files (TS/JSX/JS/TSX)
    if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') {
      let content = '';
      try {
        content = readFileSync(resolvedPath, 'utf8');
      } catch (err) {
        return result;
      }

      try {
        const sourceFile = ts.createSourceFile(resolvedPath, content, ts.ScriptTarget.Latest, true);

        const walk = (node: ts.Node) => {
          // A. Static imports
          if (ts.isImportDeclaration(node)) {
            if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
              const source = node.moduleSpecifier.text;
              const resolved = this.resolveImport(source, filePath);
              if (resolved) {
                result.dependencies.push(resolved);
              }
            }
          }
          // B. Static exports / barrel re-exports
          else if (ts.isExportDeclaration(node)) {
            if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
              const source = node.moduleSpecifier.text;
              const resolved = this.resolveImport(source, filePath);
              if (resolved) {
                result.dependencies.push(resolved);
              }
            }
            // Parse named exports: export { x, y }
            if (node.exportClause && ts.isNamedExports(node.exportClause)) {
              for (const element of node.exportClause.elements) {
                result.exports.push(element.name.text);
              }
            }
          }
          // C. Named function/class/variable exports
          else if (ts.isFunctionDeclaration(node) && node.name) {
            if (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) {
              result.exports.push(node.name.text);
            }
          } else if (ts.isClassDeclaration(node) && node.name) {
            if (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) {
              result.exports.push(node.name.text);
            }
          } else if (ts.isInterfaceDeclaration(node) && node.name) {
            if (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) {
              result.exports.push(node.name.text);
            }
          } else if (ts.isTypeAliasDeclaration(node) && node.name) {
            if (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) {
              result.exports.push(node.name.text);
            }
          } else if (ts.isVariableStatement(node)) {
            if (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) {
              for (const decl of node.declarationList.declarations) {
                if (ts.isIdentifier(decl.name)) {
                  result.exports.push(decl.name.text);
                }
              }
            }
          } else if (ts.isExportAssignment(node)) {
            result.exports.push('default');
          }
          // D. Dynamic import() & require()
          else if (ts.isCallExpression(node)) {
            if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
              const firstArg = node.arguments[0];
              if (firstArg && ts.isStringLiteral(firstArg)) {
                const source = firstArg.text;
                result.dynamicImports.push(source);
                const resolved = this.resolveImport(source, filePath);
                if (resolved) {
                  result.dependencies.push(resolved);
                }
              }
            } else if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
              const firstArg = node.arguments[0];
              if (firstArg && ts.isStringLiteral(firstArg)) {
                const source = firstArg.text;
                const resolved = this.resolveImport(source, filePath);
                if (resolved) {
                  result.dependencies.push(resolved);
                }
              }
            }
          }
          // E. Scan string literals for asset references
          else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
            const text = node.text;
            if (/\.(png|jpg|jpeg|svg|webp|css|scss)$/i.test(text)) {
              result.assetReferences.push(text);
              const resolved = this.resolveImport(text, filePath);
              if (resolved) {
                result.dependencies.push(resolved);
              }
            }
          }

          ts.forEachChild(node, walk);
        };

        walk(sourceFile);

        // Record parser warnings from diagnostics if any
        if (sourceFile.parseDiagnostics && sourceFile.parseDiagnostics.length > 0) {
          for (const diag of sourceFile.parseDiagnostics) {
            const pos = ts.getLineAndCharacterOfPosition(sourceFile, diag.start || 0);
            const msg = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
            this.recordWarning(filePath, `Syntax error: ${msg}`, pos.line + 1);
          }
        }
      } catch (err: any) {
        // AST parser fallback to regex on syntax errors
        const line = err?.line || 1;
        const msg = `AST Parser Fallback triggered: ${err?.message || err}`;
        this.recordWarning(filePath, msg, line);

        // Regex Fallback
        try {
          const importRegex = /(?:import|export)\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g;
          let match;
          while ((match = importRegex.exec(content)) !== null) {
            const source = match[1];
            const resolved = this.resolveImport(source, filePath);
            if (resolved) {
              result.dependencies.push(resolved);
            }
          }
        } catch (regexErr) {
          // Ignore regex errors
        }
      }
    }

    // Deduplicate
    result.dependencies = Array.from(new Set(result.dependencies));
    result.exports = Array.from(new Set(result.exports));
    result.dynamicImports = Array.from(new Set(result.dynamicImports));
    result.assetReferences = Array.from(new Set(result.assetReferences));

    return result;
  }
}

function statSyncIsDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch (e) {
    return false;
  }
}
export const dependencyAnalyzerVersion = '1.1.0';
