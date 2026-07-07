// scripts/governance/validators/deep_import_validator.ts
//
// VAL-ARC-006 — Deep Import Restriction
//
// Blocks imports that pierce @mad/* package internals by including /src/ in the
// import path. All cross-package consumption must use the public barrel API
// (@mad/ui, @mad/types, @mad/shared, @mad/utils, @mad/validations).
//
// Policy model: public API ownership rather than path-naming convention alone.
//
//   APPROVED:  import { Button } from '@mad/ui'
//   APPROVED:  import type { Event } from '@mad/types'
//   VIOLATION: import { Button } from '@mad/ui/src/primitives/Button'
//   VIOLATION: import { x } from '@mad/shared/src/internal/utils'
//
// Exception model (zero exceptions pre-seeded — confirmed by pre-implementation scan):
//   Future exceptions must be added to governanceConfig.deepImportExceptions with:
//     { path, importPattern, justification, owner, reviewDate }
//
// Exclusions:
//   - governanceConfig.scanScope.excludedPaths
//   - test files (*.test.ts, *.spec.ts)
//   - node_modules / .next / dist / coverage

import * as path from 'path';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';
import { FileContentCache } from '../core/ast_parser_cache';
import { governanceConfig } from '../core/governance.config';

// ─── Public API package list ─────────────────────────────────────────────────
// These are the ONLY approved import entry-points for @mad/* packages.
// Importing any path deeper than these is a violation.

const MAD_PUBLIC_PACKAGES = new Set([
  '@mad/ui',
  '@mad/types',
  '@mad/shared',
  '@mad/utils',
  '@mad/validations',
]);

// ─── Import extraction (line-by-line for speed) ──────────────────────────────

const IMPORT_LINE_RE = /^\s*(?:import|export)\s+(?:.*\s+from\s+)?['"]([^'"]+)['"]/;

interface ImportOccurrence {
  importPath: string;
  line: number;
}

function extractImports(content: string): ImportOccurrence[] {
  const results: ImportOccurrence[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(IMPORT_LINE_RE);
    if (match) {
      results.push({ importPath: match[1], line: i + 1 });
    }
  }
  return results;
}

// ─── Violation detection ─────────────────────────────────────────────────────

function isDeepImport(importPath: string): boolean {
  // Must start with @mad/ to be in scope
  if (!importPath.startsWith('@mad/')) return false;

  // Extract the package name (@mad/ui, @mad/types, etc.)
  const parts = importPath.split('/');
  // @mad/<package>/... — parts[0]='@mad', parts[1]=<package>
  const pkgName = `@mad/${parts[1]}`;

  // If the import is exactly the package name → public API → allowed
  if (importPath === pkgName) return false;

  // If the import goes deeper than the package name AND contains /src/ → violation
  if (importPath.includes('/src/')) return true;

  // Sub-path beyond the package name without /src/ — not currently flagged
  // (may be a valid sub-export declared in package.json exports map)
  return false;
}

// ─── Exception lookup ────────────────────────────────────────────────────────

interface DeepImportException {
  path: string;
  importPattern: string;
  justification: string;
  owner: string;
  reviewDate: string;
}

function isException(file: string, importPath: string): boolean {
  const exceptions: DeepImportException[] =
    (governanceConfig as any).deepImportExceptions || [];
  const n = file.replace(/\\/g, '/');
  return exceptions.some(
    ex => (n === ex.path || n.endsWith(ex.path)) && importPath.startsWith(ex.importPattern)
  );
}

// ─── Exclusion helpers ───────────────────────────────────────────────────────

function norm(p: string): string {
  return p.replace(/\\/g, '/');
}

const EXCLUDED_FRAGMENTS = [
  'node_modules/',
  '.next/',
  'dist/',
  'coverage/',
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
  '.d.ts',
];

function isExcluded(file: string): boolean {
  const n = norm(file);
  const excludedPaths = governanceConfig.scanScope?.excludedPaths || [];
  if (excludedPaths.some(ep => n === ep || n.startsWith(ep + '/'))) return true;
  return EXCLUDED_FRAGMENTS.some(frag => n.includes(frag));
}

// ─── Validator ───────────────────────────────────────────────────────────────

export class DeepImportValidator implements GovernanceValidator {
  readonly name = 'DeepImportValidator';

  public async run(files: string[], _metadata: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const startTime = Date.now();

    const eligible = files
      .map(norm)
      .filter(f => {
        if (isExcluded(f)) return false;
        if (!f.match(/^(apps|packages)\//)) return false;
        return /\.(ts|tsx|js|jsx)$/.test(f);
      });

    for (const file of eligible) {
      const content = FileContentCache.get(file);
      if (!content) continue;

      const imports = extractImports(content);
      for (const { importPath, line } of imports) {
        if (!isDeepImport(importPath)) continue;
        if (isException(file, importPath)) continue;

        errors.push({
          file,
          line,
          rule: 'VAL-ARC-006',
          severity: 'ERROR',
          message: `Deep import violation: '${importPath}' pierces package internals. Use the public barrel API instead.`,
          snippet: importPath,
        });
      }
    }

    return {
      name: this.name,
      success: errors.length === 0,
      errors,
      warnings,
      statistics: {
        filesScanned: eligible.length,
        violationsFound: errors.length,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }
}
