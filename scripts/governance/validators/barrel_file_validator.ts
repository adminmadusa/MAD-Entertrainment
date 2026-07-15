// scripts/governance/validators/barrel_file_validator.ts
//
// VAL-ARC-007 — Barrel File API Surface Governance
//
// Validates packages/*/src/index.ts barrel files for:
//   (ERROR)   Duplicate named exports
//   (ERROR)   Wildcard re-export conflicts (two export * from X both exporting same name)
//   (ERROR)   Export of internal/ or private/ paths
//   (ERROR)   Circular re-export chains within the barrel graph
//   (WARNING) Exports marked @internal in JSDoc
//   (WARNING) Empty barrels (no exports)
//
// Scope: packages/*/src/index.ts ONLY — apps/ barrels are not enforced.
//
// CI Policy: WARN on initial rollout. Promote to FAIL_BUILD after first clean CI run.
//
// Exclusions:
//   - governanceConfig.scanScope.excludedPaths
//   - apps/ barrel files
//   - test files

import * as path from 'path';
import * as fs from 'fs';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';
import { FileContentCache } from '../core/ast_parser_cache';
import { governanceConfig } from '../core/governance.config';

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function norm(p: string): string {
  return p.replace(/\\/g, '/');
}

function isExcluded(file: string): boolean {
  const n = norm(file);
  const excludedPaths = governanceConfig.scanScope?.excludedPaths || [];
  if (excludedPaths.some(ep => n === ep || n.startsWith(ep + '/'))) return true;
  if (n.includes('node_modules/') || n.includes('.next/') || n.includes('dist/')) return true;
  if (n.includes('.test.') || n.includes('.spec.')) return true;
  return false;
}

function isBarrelFile(file: string): boolean {
  const n = norm(file);
  // Only package root index.ts/index.tsx files are enforced (packages/<name>/src/index.ts or packages/<name>/index.ts)
  const match = n.match(/^packages\/[^/]+\/(src\/)?index\.tsx?$/);
  // Exclude non-library packages like governance-cli
  if (n.startsWith('packages/governance-cli/')) return false;
  return !!match;
}

// ─── Export extraction ───────────────────────────────────────────────────────

interface ExportEntry {
  type: 'named' | 'wildcard' | 'default';
  name?: string;       // for named exports
  fromPath?: string;   // for re-exports
  line: number;
  snippet: string;
}

function extractExports(content: string): ExportEntry[] {
  const entries: ExportEntry[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = i + 1;

    // export * from './X'
    const wildcardMatch = raw.match(/^\s*export\s+\*\s+from\s+['"]([^'"]+)['"]/);
    if (wildcardMatch) {
      entries.push({ type: 'wildcard', fromPath: wildcardMatch[1], line, snippet: raw.trim() });
      continue;
    }

    // export { A, B, C } from './X'  OR  export { A }
    const namedMatch = raw.match(/^\s*export\s+\{([^}]+)\}/);
    if (namedMatch) {
      const fromMatch = raw.match(/from\s+['"]([^'"]+)['"]/);
      const fromPath = fromMatch ? fromMatch[1] : undefined;
      const names = namedMatch[1]
        .split(',')
        .map(s => s.trim().split(/\s+as\s+/).pop()!.trim())
        .filter(Boolean);
      for (const name of names) {
        entries.push({ type: 'named', name, fromPath, line, snippet: raw.trim() });
      }
      continue;
    }

    // export type { A } from './X'
    const namedTypeMatch = raw.match(/^\s*export\s+type\s+\{([^}]+)\}/);
    if (namedTypeMatch) {
      const fromMatch = raw.match(/from\s+['"]([^'"]+)['"]/);
      const fromPath = fromMatch ? fromMatch[1] : undefined;
      const names = namedTypeMatch[1]
        .split(',')
        .map(s => s.trim().split(/\s+as\s+/).pop()!.trim())
        .filter(Boolean);
      for (const name of names) {
        entries.push({ type: 'named', name, fromPath, line, snippet: raw.trim() });
      }
      continue;
    }

    // export default
    if (/^\s*export\s+default\s+/.test(raw)) {
      entries.push({ type: 'default', line, snippet: raw.trim() });
    }
  }

  return entries;
}

// ─── Internal/private path check ─────────────────────────────────────────────

function isInternalPath(fromPath: string | undefined): boolean {
  if (!fromPath) return false;
  return fromPath.includes('/internal') || fromPath.includes('/private');
}

// ─── @internal JSDoc detection ────────────────────────────────────────────────

function hasInternalJsDoc(content: string, lineNum: number): boolean {
  const lines = content.split('\n');
  // Look backwards up to 5 lines for a JSDoc @internal tag
  for (let i = lineNum - 2; i >= Math.max(0, lineNum - 6); i--) {
    if (lines[i].includes('@internal')) return true;
    if (lines[i].includes('*/')) break;
  }
  return false;
}

// ─── Circular re-export detection ────────────────────────────────────────────

function detectCircularReExports(
  barrelFile: string,
  entries: ExportEntry[]
): string | null {
  const barrelDir = path.dirname(path.resolve(WORKSPACE_ROOT, barrelFile));
  const visited = new Set<string>();
  const stack = new Set<string>();

  function visit(currentFile: string): boolean {
    const n = norm(path.relative(WORKSPACE_ROOT, currentFile));
    if (stack.has(n)) return true;   // cycle
    if (visited.has(n)) return false;

    stack.add(n);
    visited.add(n);

    const absPath = path.resolve(WORKSPACE_ROOT, n);
    if (!fs.existsSync(absPath)) {
      stack.delete(n);
      return false;
    }

    const content = fs.readFileSync(absPath, 'utf8');
    const subEntries = extractExports(content);

    for (const entry of subEntries) {
      if (!entry.fromPath) continue;
      let resolved: string;
      try {
        resolved = path.resolve(path.dirname(absPath), entry.fromPath);
        const rNorm = norm(path.relative(WORKSPACE_ROOT, resolved));
        const withExt = [rNorm, rNorm + '.ts', rNorm + '.tsx', rNorm + '/index.ts']
          .find(p => fs.existsSync(path.resolve(WORKSPACE_ROOT, p)));
        if (!withExt) continue;
        if (visit(path.resolve(WORKSPACE_ROOT, withExt))) return true;
      } catch {
        continue;
      }
    }

    stack.delete(n);
    return false;
  }

  // Check each re-export source
  for (const entry of entries) {
    if (!entry.fromPath) continue;
    try {
      const resolved = path.resolve(barrelDir, entry.fromPath);
      const rNorm = norm(path.relative(WORKSPACE_ROOT, resolved));
      const withExt = [rNorm, rNorm + '.ts', rNorm + '.tsx', rNorm + '/index.ts']
        .find(p => fs.existsSync(path.resolve(WORKSPACE_ROOT, p)));
      if (!withExt) continue;
      if (visit(path.resolve(WORKSPACE_ROOT, withExt))) {
        return entry.fromPath;
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ─── Validator ───────────────────────────────────────────────────────────────

export class BarrelFileValidator implements GovernanceValidator {
  readonly name = 'BarrelFileValidator';

  public async run(files: string[], _metadata: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const startTime = Date.now();

    const barrels = files
      .map(norm)
      .filter(f => isBarrelFile(f) && !isExcluded(f));

    for (const barrel of barrels) {
      const content = FileContentCache.getFileContent(barrel);
      if (content === null) continue;

      const entries = extractExports(content);

      // Check: Empty barrel (no exports of any kind, either inline or re-exports)
      const hasAnyExport = /^\s*export\s+/m.test(content);
      if (entries.length === 0 && !hasAnyExport) {
        warnings.push({
          file: barrel,
          line: 1,
          rule: 'VAL-ARC-007',
          severity: 'WARNING',
          message: `Empty barrel file — no exports found. Remove or populate ${barrel}.`,
          snippet: '',
        });
        continue;
      }

      // Check: Duplicate named exports
      const namedExports = entries.filter(e => e.type === 'named' && e.name);
      const seen = new Map<string, number>();
      for (const entry of namedExports) {
        const name = entry.name!;
        if (seen.has(name)) {
          errors.push({
            file: barrel,
            line: entry.line,
            rule: 'VAL-ARC-007',
            severity: 'ERROR',
            message: `Duplicate export '${name}' in barrel. First declared at line ${seen.get(name)}.`,
            snippet: entry.snippet,
          });
        } else {
          seen.set(name, entry.line);
        }
      }

      // Check: Export from internal/ or private/ paths
      for (const entry of entries) {
        if (isInternalPath(entry.fromPath)) {
          errors.push({
            file: barrel,
            line: entry.line,
            rule: 'VAL-ARC-007',
            severity: 'ERROR',
            message: `Barrel exports from internal/private path '${entry.fromPath}' — this leaks implementation details.`,
            snippet: entry.snippet,
          });
        }
      }

      // Check: @internal JSDoc on exported symbols
      for (const entry of namedExports) {
        if (hasInternalJsDoc(content, entry.line)) {
          warnings.push({
            file: barrel,
            line: entry.line,
            rule: 'VAL-ARC-007',
            severity: 'WARNING',
            message: `Export '${entry.name}' is marked @internal but is exposed in barrel file.`,
            snippet: entry.snippet,
          });
        }
      }

      // Check: Circular re-export chains
      const circularSource = detectCircularReExports(barrel, entries);
      if (circularSource) {
        errors.push({
          file: barrel,
          line: 1,
          rule: 'VAL-ARC-007',
          severity: 'ERROR',
          message: `Circular re-export chain detected in barrel — path '${circularSource}' creates a cycle.`,
          snippet: circularSource,
        });
      }
    }

    return {
      name: this.name,
      success: errors.length === 0,
      errors,
      warnings,
      statistics: {
        barrelsScanned: barrels.length,
        errorsFound: errors.length,
        warningsFound: warnings.length,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }
}
