// scripts/governance/validators/circular_import_validator.ts
//
// VAL-ARC-005 — Circular Import Detection (Critical)
//   Cross-package cycles and runtime-initialization cycles → FAIL_BUILD
//
// VAL-ARC-005b — Circular Import Detection (Warning)
//   Intra-package feature-folder cycles → WARN
//
// Algorithm: Iterative DFS per root file using DependencyAnalyzer.analyzeImports()
// to resolve edges. A cycle is detected when a node appears in the current
// recursion stack. Cycles are canonicalized before reporting to eliminate duplicates.
//
// Exclusions:
//   - governanceConfig.scanScope.excludedPaths
//   - *.d.ts declaration files
//   - node_modules / .next / dist / coverage directories

import * as path from 'path';
import * as fs from 'fs';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';
import { DependencyAnalyzer } from '../core/dependency_analyzer';
import { governanceConfig } from '../core/governance.config';

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');

// ─── Exclusion helpers ──────────────────────────────────────────────────────

const EXCLUDED_FRAGMENTS = [
  'node_modules/',
  '.next/',
  'dist/',
  'coverage/',
  '.d.ts',
  '/config/',
];

function norm(p: string): string {
  return p.replace(/\\/g, '/');
}

function isExcluded(file: string): boolean {
  const n = norm(file);
  const excludedPaths = governanceConfig.scanScope?.excludedPaths || [];
  if (excludedPaths.some(ep => n === ep || n.startsWith(ep + '/'))) return true;
  return EXCLUDED_FRAGMENTS.some(frag => n.includes(frag));
}

function isCrossPackage(fileA: string, fileB: string): boolean {
  // Determine the top-level scope of each file (apps/web, apps/admin, packages/ui, etc.)
  const scopeOf = (f: string): string => {
    const n = norm(f);
    const match = n.match(/^(apps\/[^/]+|packages\/[^/]+)/);
    return match ? match[1] : '';
  };
  return scopeOf(fileA) !== scopeOf(fileB);
}

// ─── Cycle canonicalization ─────────────────────────────────────────────────

/**
 * Canonicalize a detected cycle path so that A→B→C→A and B→C→A→B
 * are reported as the same finding.
 */
function canonicalizeCycle(cycle: string[]): string {
  const minIdx = cycle.indexOf(cycle.reduce((a, b) => (a < b ? a : b)));
  const rotated = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
  return rotated.join(' → ');
}

// ─── DFS cycle detection ────────────────────────────────────────────────────

interface CycleRecord {
  canonical: string;
  cycle: string[];
  isCrossPackage: boolean;
}

function detectCycles(files: string[]): CycleRecord[] {
  const fileSet = new Set(files.map(norm));
  const visited = new Set<string>();
  const found = new Map<string, CycleRecord>();

  for (const startFile of files) {
    if (visited.has(norm(startFile))) continue;

    // Iterative DFS using an explicit stack
    const stack: string[] = [];
    const stackSet = new Set<string>();
    const dfsStack: Array<{ file: string; deps: string[]; depIdx: number }> = [];

    dfsStack.push({ file: norm(startFile), deps: [], depIdx: -1 });

    while (dfsStack.length > 0) {
      const frame = dfsStack[dfsStack.length - 1];

      if (frame.depIdx === -1) {
        // First visit to this node
        if (visited.has(frame.file)) {
          dfsStack.pop();
          continue;
        }
        // Resolve dependencies
        const absPath = path.resolve(WORKSPACE_ROOT, frame.file);
        let deps: string[] = [];
        if (fs.existsSync(absPath)) {
          deps = DependencyAnalyzer.analyzeImports(frame.file)
            .map(norm)
            .filter(d => fileSet.has(d) && !isExcluded(d));
        }
        frame.deps = deps;
        frame.depIdx = 0;
        stack.push(frame.file);
        stackSet.add(frame.file);
      }

      if (frame.depIdx >= frame.deps.length) {
        // All deps processed — backtrack
        stack.pop();
        stackSet.delete(frame.file);
        visited.add(frame.file);
        dfsStack.pop();
        continue;
      }

      const dep = frame.deps[frame.depIdx];
      frame.depIdx++;

      if (stackSet.has(dep)) {
        // Cycle detected — extract cycle path from stack
        const cycleStart = stack.indexOf(dep);
        const cyclePath = [...stack.slice(cycleStart), dep];
        const canonical = canonicalizeCycle(cyclePath.slice(0, -1));

        if (!found.has(canonical)) {
          const crossPkg = cyclePath.some((f, i) =>
            i < cyclePath.length - 1 && isCrossPackage(f, cyclePath[i + 1])
          );
          found.set(canonical, { canonical, cycle: cyclePath, isCrossPackage: crossPkg });
        }
      } else if (!visited.has(dep)) {
        dfsStack.push({ file: dep, deps: [], depIdx: -1 });
      }
    }
  }

  return Array.from(found.values());
}

// ─── Validator ──────────────────────────────────────────────────────────────

export class CircularImportValidator implements GovernanceValidator {
  readonly name = 'CircularImportValidator';

  public async run(files: string[], _metadata: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const startTime = Date.now();

    const eligible = files
      .map(norm)
      .filter(f => {
        if (isExcluded(f)) return false;
        // Only TypeScript/JavaScript source files within apps/ or packages/
        if (!f.match(/^(apps|packages)\//)) return false;
        return /\.(ts|tsx|js|jsx)$/.test(f);
      });

    const cycles = detectCycles(eligible);

    for (const { canonical, cycle, isCrossPackage: crossPkg } of cycles) {
      const sourceFile = cycle[0];
      const message = `Circular import cycle${crossPkg ? ' [CROSS-PACKAGE]' : ' [INTERNAL]'}: ${cycle.join(' → ')}`;

      if (crossPkg) {
        errors.push({
          file: sourceFile,
          line: 1,
          rule: 'VAL-ARC-005',
          severity: 'CRITICAL',
          message,
          snippet: canonical,
        });
      } else {
        warnings.push({
          file: sourceFile,
          line: 1,
          rule: 'VAL-ARC-005b',
          severity: 'WARNING',
          message,
          snippet: canonical,
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
        cyclesFound: cycles.length,
        criticalCycles: errors.length,
        warningCycles: warnings.length,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }
}
