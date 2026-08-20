import * as ts from 'typescript';
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError, GovernanceMetadata } from '../core/types';
import { FileContentCache, ASTParserCache } from '../core/ast_parser_cache';
import { governanceConfig } from '../core/governance.config';


const workspaceRoot = resolve(__dirname, '../../..');

// Standard Node.js built-in modules list
const BUILTINS = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain',
  'events', 'fs', 'http', 'http2', 'https', 'inspector', 'module', 'net',
  'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring', 'readline',
  'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'trace_events',
  'tty', 'url', 'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib'
]);

export class RepositoryHygieneValidator implements GovernanceValidator {
  readonly name = 'RepositoryHygieneValidator';

  public async run(files: string[], metadata: GovernanceMetadata): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const startTime = Date.now();

    // VAL-HYG-008: Check if current branch is protected (develop, live, main, master) and working tree has modifications
    let branchName = 'unknown';
    try {
      const { execSync } = require('child_process');
      branchName = execSync('git rev-parse --abbrev-ref HEAD', { cwd: workspaceRoot, encoding: 'utf8' }).trim();
    } catch {}

    const isProtectedBranch = ['develop', 'live', 'main', 'master'].includes(branchName);
    if (isProtectedBranch) {
      let hasModifiedFiles = false;
      try {
        const { execSync } = require('child_process');
        const diffStatus = execSync('git status --porcelain', { cwd: workspaceRoot, encoding: 'utf8' }).trim();
        const linesList = diffStatus.split('\n').filter(Boolean);
        // Look for staged/unstaged changes, ignoring untracked files (??) or the .governance folder
        const trackedChanges = linesList.filter(l => !l.startsWith('??') && !l.includes('.governance/'));
        if (trackedChanges.length > 0) {
          hasModifiedFiles = true;
        }
      } catch {}

      if (hasModifiedFiles) {
        errors.push({
          file: '.git',
          rule: 'VAL-HYG-008',
          severity: 'CRITICAL',
          message: `Direct modification on protected branch "${branchName}" detected! Working directly on protected branches violates git boundary safety.
Remediation Steps:
  1. Stash your changes: git stash
  2. Create/Switch to a feature branch: git checkout -b feat/your-feature-name
  3. Reapply your changes: git stash pop`,
          line: 0,
        });
      }
    }

    // VAL-HYG-009: Tracked Build Output in Source & VAL-HYG-010: Tracked Bytecode
    for (const file of files) {
      const normTracked = file.replace(/\\/g, '/');

      // Check for Python bytecode
      if (normTracked.endsWith('.pyc') || normTracked.includes('__pycache__/')) {
        errors.push({
          file,
          rule: 'VAL-HYG-010',
          severity: 'ERROR',
          message: `Tracked Python bytecode or __pycache__ directory detected in Git: "${file}". Untrack and delete this file and update .gitignore.`,
          line: 0,
        });
      }

      // Check for compiled TS outputs tracked in src/
      if (
        (normTracked.startsWith('packages/') || normTracked.startsWith('apps/')) &&
        normTracked.includes('/src/') &&
        (normTracked.endsWith('.d.ts') || normTracked.endsWith('.js.map') || (normTracked.endsWith('.js') && existsSync(resolve(workspaceRoot, normTracked.replace(/\.js$/, '.ts')))))
      ) {
        // Next.js next-env.d.ts is allowed in app roots
        if (!normTracked.endsWith('next-env.d.ts')) {
          errors.push({
            file,
            rule: 'VAL-HYG-009',
            severity: 'ERROR',
            message: `Tracked build artifact detected inside source directory: "${file}". Build artifacts must reside in dist/ or .next/ and remain untracked.`,
            line: 0,
          });
        }
      }
    }

    const filteredFiles = files.filter(file => {
      const norm = file.replace(/\\/g, '/');

      // Exclude configured scanScope.excludedPaths
      const excludedPaths = governanceConfig.scanScope?.excludedPaths || [];
      if (excludedPaths.some(p => norm === p || norm.startsWith(p + '/'))) {
        return false;
      }

      // Exclude build / generated / vendor dirs
      if (
        norm.startsWith('node_modules/') ||

        norm.startsWith('.next/') ||
        norm.startsWith('dist/') ||
        norm.startsWith('coverage/') ||
        norm.startsWith('build/') ||
        norm.startsWith('generated/') ||
        norm.startsWith('vendor/') ||
        norm.includes('/generated/') ||
        norm.includes('/vendor/')
      ) {
        return false;
      }
      // Exclude test fixtures
      if (
        norm.includes('scripts/governance/__fixtures__') ||
        norm.includes('__tests__/fixtures__')
      ) {
        return false;
      }
      // Exclude specific file extensions/patterns
      if (
        norm.endsWith('.d.ts') ||
        norm.includes('.generated.') ||
        norm.includes('.gen.')
      ) {
        return false;
      }
      // Must be source files or markdown
      return norm.endsWith('.ts') || norm.endsWith('.tsx') || norm.endsWith('.js') || norm.endsWith('.jsx') || norm.endsWith('.md');
    });

    for (const relPath of filteredFiles) {
      const fullPath = resolve(workspaceRoot, relPath);
      if (!existsSync(fullPath) || !statSync(fullPath).isFile()) {
        continue;
      }

      const content = FileContentCache.getFileContent(relPath);
      if (!content) continue;

      // 1. Text-Based Rules (VAL-HYG-004, VAL-HYG-005, VAL-HYG-006)
      this.checkWhitespaceRules(relPath, content, warnings);

      // 2. AST-Based Rules (VAL-HYG-001, VAL-HYG-002, VAL-HYG-003) for code files only
      if (
        relPath.endsWith('.ts') ||
        relPath.endsWith('.tsx') ||
        relPath.endsWith('.js') ||
        relPath.endsWith('.jsx')
      ) {
        const sourceFile = ASTParserCache.getSourceFile(relPath);
        if (sourceFile) {
          this.checkASTImports(relPath, sourceFile, errors, warnings);
        }
      }
    }

    return {
      name: this.name,
      success: errors.filter(e => e.severity === 'ERROR').length === 0,
      errors,
      warnings,
      executionTimeMs: Date.now() - startTime,
    };
  }

  private checkWhitespaceRules(relPath: string, content: string, warnings: ValidationError[]) {
    const lines = content.split('\n');

    // VAL-HYG-004: Trailing Whitespace
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/[ \t]+$/.test(line)) {
        warnings.push({
          file: relPath,
          rule: 'VAL-HYG-004',
          severity: 'WARNING',
          message: 'Trailing whitespace characters detected.',
          line: i + 1,
        });
      }
    }

    // VAL-HYG-005: EOF Newline (Verify exactly one trailing newline unless empty)
    if (content.length > 0) {
      if (!content.endsWith('\n') || content.endsWith('\n\n')) {
        warnings.push({
          file: relPath,
          rule: 'VAL-HYG-005',
          severity: 'WARNING',
          message: 'File must terminate with exactly one trailing newline character.',
          line: lines.length,
        });
      }
    }

    // VAL-HYG-006: Excessive Blank Lines
    let consecutiveBlankCount = 0;
    let startLine = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '') {
        if (consecutiveBlankCount === 0) {
          startLine = i + 1;
        }
        consecutiveBlankCount++;
      } else {
        if (consecutiveBlankCount >= 3) {
          warnings.push({
            file: relPath,
            rule: 'VAL-HYG-006',
            severity: 'WARNING',
            message: `Excessive consecutive blank lines detected (${consecutiveBlankCount} lines).`,
            line: startLine,
          });
        }
        consecutiveBlankCount = 0;
      }
    }
    // Check EOF blank lines
    if (consecutiveBlankCount >= 3) {
      warnings.push({
        file: relPath,
        rule: 'VAL-HYG-006',
        severity: 'WARNING',
        message: `Excessive consecutive blank lines detected (${consecutiveBlankCount} lines).`,
        line: startLine,
      });
    }
  }

  private checkASTImports(
    relPath: string,
    sourceFile: ts.SourceFile,
    errors: ValidationError[],
    warnings: ValidationError[]
  ) {
    const imports: ts.ImportDeclaration[] = [];
    sourceFile.forEachChild(node => {
      if (ts.isImportDeclaration(node)) {
        imports.push(node);
      }
    });

    if (imports.length === 0) return;

    // VAL-HYG-002: Duplicate Imports
    const seenPaths = new Set<string>();
    for (const imp of imports) {
      if (ts.isStringLiteral(imp.moduleSpecifier)) {
        const pathVal = imp.moduleSpecifier.text;
        const line = sourceFile.getLineAndCharacterOfPosition(imp.getStart()).line + 1;
        if (seenPaths.has(pathVal)) {
          errors.push({
            file: relPath,
            rule: 'VAL-HYG-002',
            severity: 'ERROR',
            message: `Duplicate import declaration from module path "${pathVal}".`,
            line,
          });
        } else {
          seenPaths.add(pathVal);
        }
      }
    }

    // VAL-HYG-003: Type Imports Enforcement
    for (const imp of imports) {
      if (ts.isStringLiteral(imp.moduleSpecifier)) {
        const pathVal = imp.moduleSpecifier.text;
        const isTypeOnly = imp.importClause?.isTypeOnly === true;
        const line = sourceFile.getLineAndCharacterOfPosition(imp.getStart()).line + 1;

        // Skip if already a `import type` declaration
        if (isTypeOnly) continue;

        // Check if this import uses inline type modifiers (mixed import).
        // e.g. import { value, type MyType } from '...'
        // These cannot be simply converted to `import type` and should not be flagged.
        const hasMixedTypeBindings =
          imp.importClause?.namedBindings &&
          ts.isNamedImports(imp.importClause.namedBindings) &&
          imp.importClause.namedBindings.elements.some(el => el.isTypeOnly);

        if (
          !hasMixedTypeBindings &&
          (pathVal.includes('/types') || pathVal.endsWith('/types') || pathVal.endsWith('types') || pathVal.includes('packages/types'))
        ) {
          warnings.push({
            file: relPath,
            rule: 'VAL-HYG-003',
            severity: 'WARNING',
            message: `Import from types module "${pathVal}" should use "import type".`,
            line,
          });
        }
      }
    }

    // VAL-HYG-001: Import Ordering & Grouping (Skip for test files and entrypoint to accommodate hoisting/bootstrapping patterns)
    const isTestFile = relPath.endsWith('.test.ts') || relPath.endsWith('.test.tsx') || relPath.endsWith('.spec.ts') || relPath.endsWith('.spec.tsx');
    const isAppEntrypoint = relPath === 'apps/server/src/server.ts';
    if (!isTestFile && !isAppEntrypoint) {
      this.verifyImportGroups(relPath, sourceFile, imports, warnings);
    }
  }

  private verifyImportGroups(
    relPath: string,
    sourceFile: ts.SourceFile,
    imports: ts.ImportDeclaration[],
    warnings: ValidationError[]
  ) {
    // Classify each import into a group index:
    // 0: Node builtins
    // 1: Third party packages
    // 2: Workspace aliases (@mad/*, @/*)
    // 3: Relative path imports (../, ./)
    // 4: Side effect imports
    const getGroupIndex = (imp: ts.ImportDeclaration): number => {
      if (!imp.importClause) {
        return 4; // Side-effect import
      }
      if (ts.isStringLiteral(imp.moduleSpecifier)) {
        const pathVal = imp.moduleSpecifier.text;
        if (BUILTINS.has(pathVal) || pathVal.startsWith('node:')) {
          return 0;
        }
        if (pathVal.startsWith('@mad/') || pathVal.startsWith('@/')) {
          return 2;
        }
        if (pathVal.startsWith('.') || pathVal.startsWith('..')) {
          return 3;
        }
      }
      return 1; // Default: third party
    };

    const classified = imports.map(imp => {
      const pathVal = ts.isStringLiteral(imp.moduleSpecifier) ? imp.moduleSpecifier.text : '';
      const line = sourceFile.getLineAndCharacterOfPosition(imp.getStart()).line + 1;
      // Use getFullStart for end-line calculation to handle multiline imports correctly
      const endLine = sourceFile.getLineAndCharacterOfPosition(imp.getEnd()).line + 1;
      return {
        node: imp,
        path: pathVal,
        group: getGroupIndex(imp),
        line,
        endLine,
      };
    });

    // 1. Group Ordering Check (group indices must be non-decreasing)
    let currentMaxGroup = -1;
    let groupOrderViolation = false;

    for (const item of classified) {
      if (item.group < currentMaxGroup) {
        groupOrderViolation = true;
        break;
      }
      currentMaxGroup = item.group;
    }

    if (groupOrderViolation) {
      warnings.push({
        file: relPath,
        rule: 'VAL-HYG-001',
        severity: 'WARNING',
        message: 'Imports must be grouped in order: Node built-ins, Third-party packages, Workspace aliases, Relative paths, Side-effects.',
        line: classified[0].line,
      });
      return;
    }

    // 2. Alphabetical Ordering & Blank Line separation checks
    const groups: typeof classified[] = [[], [], [], [], []];
    classified.forEach(item => groups[item.group].push(item));

    // Check blank line spacing between non-empty groups
    let lastNonEmptyGroupIndex = -1;
    for (let i = 0; i < groups.length; i++) {
      const grp = groups[i];
      if (grp.length > 0) {
        if (lastNonEmptyGroupIndex !== -1) {
          // Verify that the line number difference between the first import of this group
          // and the last import of the previous group is > 1 (i.e. at least one blank line).
          // Use endLine of the previous group's last import to correctly handle multiline imports.
          const lastImportOfPrevGroup = groups[lastNonEmptyGroupIndex][groups[lastNonEmptyGroupIndex].length - 1];
          const firstImportOfThisGroup = grp[0];

          if (firstImportOfThisGroup.line <= lastImportOfPrevGroup.endLine + 1) {
            warnings.push({
              file: relPath,
              rule: 'VAL-HYG-001',
              severity: 'WARNING',
              message: 'Groups of imports must be separated by a single blank line.',
              line: firstImportOfThisGroup.line,
            });
            return;
          }
        }
        lastNonEmptyGroupIndex = i;
      }
    }

    // Check alphabetical sorting within each group (excluding side-effects)
    for (let i = 0; i < 4; i++) {
      const grp = groups[i];
      for (let j = 1; j < grp.length; j++) {
        // Compare paths
        if (grp[j].path.localeCompare(grp[j - 1].path) < 0) {
          warnings.push({
            file: relPath,
            rule: 'VAL-HYG-001',
            severity: 'WARNING',
            message: `Imports within the same group must be sorted alphabetically ("${grp[j].path}" should precede "${grp[j - 1].path}").`,
            line: grp[j].line,
          });
          return;
        }

        // Verify NO blank lines within the same group.
        // Use endLine of the previous import to correctly handle multiline imports.
        if (grp[j].line > grp[j - 1].endLine + 1) {
          warnings.push({
            file: relPath,
            rule: 'VAL-HYG-001',
            severity: 'WARNING',
            message: 'There should be no blank lines within the same import group.',
            line: grp[j].line,
          });
          return;
        }
      }
    }
  }
}
