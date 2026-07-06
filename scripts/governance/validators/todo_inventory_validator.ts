// scripts/governance/validators/todo_inventory_validator.ts
//
// VAL-HYG-007 — TODO Inventory Consistency (Phase 1 — WARN only)
//
// Detects undocumented TODO / FIXME / HACK / XXX comment markers that lack:
//   - A GitHub issue reference:  // TODO(#123): description
//   - A ticket reference:        // TODO(TICKET-123): description
//   - An owner attribution:      // TODO(@owner): description
//
// Baseline (confirmed by pre-implementation scan): zero actual undocumented
// TODOs exist in the codebase. The 9 "XXX" matches found in pre-scan are
// all XXXXX placeholder strings in booking reference format strings, not
// technical debt comments. Phase 1 launches with a clean baseline.
//
// Phase 1 (this PR):  Scan + report as WARN only (advisory).
// Phase 2 (future):   Establish baseline inventory file.
// Phase 3 (future):   FAIL_BUILD for new undocumented TODOs only.
//
// Exclusions:
//   - governanceConfig.scanScope.excludedPaths
//   - test files (*.test.ts, *.spec.ts, *.test.tsx, *.spec.tsx)
//   - *.d.ts declaration files
//   - node_modules / .next / dist / coverage

import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';
import { FileContentCache } from '../core/ast_parser_cache';
import { governanceConfig } from '../core/governance.config';

// ─── Marker detection ────────────────────────────────────────────────────────

// Matches: // TODO ..., // FIXME ..., // HACK ..., // XXX ...
// Preceded by optional whitespace and the comment marker //
const TODO_MARKER_RE = /\/\/\s*(TODO|FIXME|HACK|XXX)\b(.*)/i;

// Documented reference patterns (any of these makes the TODO "documented")
const DOCUMENTED_PATTERNS = [
  /\(#\d+\)/,              // (#123)       — GitHub issue
  /\([A-Z]+-\d+\)/,        // (TICKET-123) — Jira / Linear ticket
  /\(@[\w-]+\)/,           // (@owner)     — owner attribution
];

function isDocumented(restOfLine: string): boolean {
  return DOCUMENTED_PATTERNS.some(p => p.test(restOfLine));
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

export class TodoInventoryValidator implements GovernanceValidator {
  readonly name = 'TodoInventoryValidator';

  public async run(files: string[], _metadata: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const startTime = Date.now();

    const eligible = files
      .map(norm)
      .filter(f => {
        if (isExcluded(f)) return false;
        return /\.(ts|tsx|js|jsx)$/.test(f);
      });

    let totalTodosFound = 0;
    let undocumentedCount = 0;

    for (const file of eligible) {
      const content = FileContentCache.get(file);
      if (!content) continue;

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(TODO_MARKER_RE);
        if (!match) continue;

        totalTodosFound++;
        const marker = match[1].toUpperCase();
        const rest = match[2] || '';

        if (isDocumented(rest)) continue;

        undocumentedCount++;
        warnings.push({
          file,
          line: i + 1,
          rule: 'VAL-HYG-007',
          severity: 'WARNING',
          message: `Undocumented ${marker} comment. Add a ticket reference (e.g. ${marker}(#123)) or owner attribution (${marker}(@owner)).`,
          snippet: lines[i].trim(),
        });
      }
    }

    return {
      name: this.name,
      success: true, // Phase 1: WARN only — never fails build
      errors,
      warnings,
      statistics: {
        filesScanned: eligible.length,
        totalTodosFound,
        documentedTodos: totalTodosFound - undocumentedCount,
        undocumentedTodos: undocumentedCount,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }
}
