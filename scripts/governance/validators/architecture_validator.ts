// scripts/governance/validators/architecture_validator.ts
//
// Detects Architecture governance violations:
//   VAL-ARC-001 — Observability Isolation (server-only scope)
//   VAL-ARC-002 — Direct Axios Import in Business Layers
//   VAL-ARC-003 — App Router Layout Safety (excessive nesting)
//   VAL-ARC-004 — Validation Drift Prevention (local Zod schemas in app code)
//
// ─────────────────────────────────────────────────────────────────────────────
// Repository Approved Exceptions (documented — never flag)
// ─────────────────────────────────────────────────────────────────────────────
//
// VAL-ARC-001 (server-only — console calls):
//   • apps/server/src/config/env.ts        — pre-logger startup env validation
//   • apps/server/src/config/             — all config files run before logger init
//   • apps/server/src/migrations/         — database migration scripts
//   • *.test.ts / *.spec.ts               — test files
//   • scripts/                            — governance and tooling scripts
//   • apps/web/** and apps/admin/**       — no approved server-side logger exists
//
// VAL-ARC-002 (direct axios import in business layers):
//   • apps/web/src/lib/api/client.ts       — approved axios client wrapper (owner)
//   • apps/admin/src/lib/api/client.ts     — approved axios client wrapper (owner)
//   • apps/server/src/utils/zeptomail.ts   — infrastructure adapter (owns HTTP transport)
//   • *.test.ts / *.spec.ts               — test files
//
// VAL-ARC-003 (layout nesting):
//   • Route groups: (auth), (group), etc. — parenthesized dirs do not add depth
//   • Parallel routes: @slot/             — prefixed with @, do not add depth
//   • Intercepting routes: (..) etc.      — dot-prefixed, do not add depth
//   • .next/ build output                 — excluded
//
// VAL-ARC-004 (Zod drift in app code):
//   • packages/validations/**             — owns schemas by design
//   • apps/server/src/validations/**      — server-side validation bridge (approved)
//   • *.test.ts / *.spec.ts              — test files
//   • scripts/governance/**              — governance tooling
//
// False Positive Policy: When uncertainty exists, suppress the finding.
//
// Cache Integration: All reads go through FileContentCache.
//                    All TS/TSX AST goes through ASTParserCache.
//                    No direct fs.readFileSync or ts.createSourceFile calls.

import * as ts from 'typescript';
import * as path from 'path';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';
import { FileContentCache, ASTParserCache } from '../core/ast_parser_cache';

// ─── Path normalization ─────────────────────────────────────────────────────

function norm(p: string): string {
  return p.replace(/\\/g, '/');
}

// ─── VAL-ARC-001 exclusion helpers ─────────────────────────────────────────

/**
 * VAL-ARC-001 only applies to the server application where the approved
 * pino logger (apps/server/src/utils/logger.ts) exists.
 */
function isServerSourceFile(file: string): boolean {
  const n = norm(file);
  return n.includes('apps/server/src/');
}

const ARC001_EXCLUDED_FRAGMENTS = [
  'apps/server/src/config/',    // pre-logger startup files
  'apps/server/src/migrations/', // database migration scripts
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
  'scripts/governance/',
  'scripts/',
  '__tests__/',
];

function isExcludedFromArc001(file: string): boolean {
  const n = norm(file);
  if (!isServerSourceFile(n)) return true; // outside server — skip entirely
  return ARC001_EXCLUDED_FRAGMENTS.some(frag => n.includes(frag));
}

// ─── VAL-ARC-002 helpers ────────────────────────────────────────────────────

/**
 * Approved infrastructure adapters: these own their HTTP transport and
 * are the correct owners of direct axios usage.
 */
const ARC002_APPROVED_ADAPTERS = [
  'apps/web/src/lib/api/client.ts',
  'apps/admin/src/lib/api/client.ts',
  'apps/server/src/utils/zeptomail.ts',
];

/**
 * Business layer path fragments that should route HTTP calls through
 * approved wrappers rather than importing axios directly.
 */
const ARC002_BUSINESS_LAYER_FRAGMENTS = [
  '/controllers/',
  '/services/',
  '/providers/',
  '/hooks/',
  '/actions/',
  '/workers/',
  '/sockets/',
];

const ARC002_EXCLUDED_FRAGMENTS = [
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
  'scripts/governance/',
  '__tests__/',
];

function isApprovedAxiosAdapter(file: string): boolean {
  const n = norm(file);
  return ARC002_APPROVED_ADAPTERS.some(adapter => n.endsWith(adapter) || n.includes(adapter));
}

function isBusinessLayer(file: string): boolean {
  const n = norm(file);
  return ARC002_BUSINESS_LAYER_FRAGMENTS.some(frag => n.includes(frag));
}

function isExcludedFromArc002(file: string): boolean {
  const n = norm(file);
  if (isApprovedAxiosAdapter(n)) return true;
  return ARC002_EXCLUDED_FRAGMENTS.some(frag => n.includes(frag));
}

// ─── VAL-ARC-004 helpers ────────────────────────────────────────────────────

const ARC004_EXCLUDED_FRAGMENTS = [
  'packages/validations/',
  'apps/server/src/validations/',
  // Config files use Zod for environment variable schema validation.
  // This is an approved configuration pattern, not business-layer validation drift.
  'apps/server/src/config/',
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
  'scripts/governance/',
  '__tests__/',
  'scripts/',
];

function isExcludedFromArc004(file: string): boolean {
  const n = norm(file);
  return ARC004_EXCLUDED_FRAGMENTS.some(frag => n.includes(frag));
}

// ─── VAL-ARC-003 layout depth helper ────────────────────────────────────────

const MAX_LAYOUT_DEPTH = 3;

/**
 * A path segment is a "transparent" segment (route group, parallel route,
 * intercepting route) that does not add layout nesting depth in Next.js.
 *
 * Route groups:      (auth), (public), ...
 * Parallel routes:   @slot, @modal, ...
 * Intercepting:      (..), (.), (...), [...]
 */
function isTransparentSegment(segment: string): boolean {
  if (segment.startsWith('(') && segment.endsWith(')')) return true;  // route groups
  if (segment.startsWith('@')) return true;                            // parallel routes
  if (segment.startsWith('.') || segment === '..') return true;       // intercepting
  return false;
}

interface LayoutDepthResult {
  file: string;
  depth: number;
  recommendation: string;
}

function computeLayoutDepths(allFiles: string[], appRootPattern: RegExp): LayoutDepthResult[] {
  const results: LayoutDepthResult[] = [];
  const layoutFiles = allFiles.filter(f => {
    const n = norm(f);
    return n.endsWith('/layout.tsx') && !n.includes('/.next/') && !n.includes('/node_modules/');
  });

  for (const layoutFile of layoutFiles) {
    const n = norm(layoutFile);
    const match = n.match(appRootPattern);
    if (!match) continue;

    // Extract the relative path after "src/app/"
    const relative = n.slice(match.index! + match[0].length);
    const segments = relative.split('/').filter(s => s.length > 0 && s !== 'layout.tsx');

    // Count only real (non-transparent) segments
    const depth = 1 + segments.filter(s => !isTransparentSegment(s)).length;

    if (depth > MAX_LAYOUT_DEPTH) {
      results.push({
        file: layoutFile,
        depth,
        recommendation: `Layout nesting depth is ${depth} (max: ${MAX_LAYOUT_DEPTH}). Consider flattening or consolidating nested layouts.`,
      });
    }
  }
  return results;
}

// ─── AST detection helpers ───────────────────────────────────────────────────

/** Returns true if the import declaration is a direct axios import. */
function isAxiosImport(node: ts.ImportDeclaration): boolean {
  if (!ts.isStringLiteral(node.moduleSpecifier)) return false;
  return node.moduleSpecifier.text === 'axios';
}

/** Returns true if node is a console.<method>(...) call expression. */
function isConsoleCall(node: ts.CallExpression): boolean {
  const expr = node.expression;
  if (!ts.isPropertyAccessExpression(expr)) return false;
  const obj = expr.expression;
  if (!ts.isIdentifier(obj) || obj.text !== 'console') return false;
  const method = expr.name.text;
  return ['log', 'warn', 'error', 'info', 'debug'].includes(method);
}

/** Zod builder method names that constitute a local schema definition. */
const ZOD_SCHEMA_BUILDERS = new Set([
  'object', 'string', 'number', 'array', 'boolean', 'enum',
  'union', 'intersection', 'tuple', 'record', 'map', 'set',
  'literal', 'nullable', 'optional', 'discriminatedUnion',
]);

/**
 * Returns true if node is a z.<schemaBuilder>(...) call,
 * indicating a local Zod schema definition.
 * Requires that `z` is actually imported from 'zod'.
 */
function isZodCall(node: ts.CallExpression, zodIdentifiers: Set<string>): boolean {
  const expr = node.expression;
  if (!ts.isPropertyAccessExpression(expr)) return false;
  const obj = expr.expression;
  if (!ts.isIdentifier(obj)) return false;
  if (!zodIdentifiers.has(obj.text)) return false;
  return ZOD_SCHEMA_BUILDERS.has(expr.name.text);
}

// ─── Validator ────────────────────────────────────────────────────────────────

export class ArchitectureValidator implements GovernanceValidator {
  readonly name = 'ArchitectureValidator';

  public async run(files: string[], _metadata: unknown): Promise<ValidationResult> {
    const startTime = Date.now();
    const warnings: ValidationError[] = [];
    const errors: ValidationError[] = [];

    // Filter out generated/build files from all scans
    const productionFiles = files.filter(f => {
      const n = norm(f);
      return !n.includes('/.next/') && !n.includes('/node_modules/') && !n.includes('/dist/');
    });

    // ── VAL-ARC-003: Layout depth scan (filesystem-based, not AST) ──────────
    // Runs across all files — layout.tsx detection is structural, not content-based
    const appRootRegex = /apps\/[^/]+\/src\/app\//;
    const layoutViolations = computeLayoutDepths(productionFiles, appRootRegex);
    for (const v of layoutViolations) {
      warnings.push({
        file: v.file,
        rule: 'VAL-ARC-003',
        severity: 'WARNING',
        message: v.recommendation,
      });
    }

    // ── AST-based scans (VAL-ARC-001, VAL-ARC-002, VAL-ARC-004) ────────────
    const tsFiles = productionFiles.filter(f => {
      const n = norm(f);
      return n.endsWith('.ts') || n.endsWith('.tsx');
    });

    for (const file of tsFiles) {
      const n = norm(file);

      const content = FileContentCache.getFileContent(n);
      if (content === null) continue;

      const sourceFile = ASTParserCache.getSourceFile(n);
      if (!sourceFile) continue;

      const lines = content.split('\n');

      // ── Collect imported identifiers for zod (VAL-ARC-004) ───────────────
      const zodIdentifiers = new Set<string>();
      // Track if this file has a direct axios import (VAL-ARC-002 pre-screen)
      let hasDirectAxiosImport = false;
      let axiosImportLine = 0;

      // First pass: collect imports
      const collectImports = (node: ts.Node) => {
        if (ts.isImportDeclaration(node)) {
          if (isAxiosImport(node)) {
            hasDirectAxiosImport = true;
            const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
            axiosImportLine = line + 1;
          }
          // Collect zod import identifiers
          if (
            ts.isStringLiteral(node.moduleSpecifier) &&
            node.moduleSpecifier.text === 'zod'
          ) {
            const clause = node.importClause;
            if (clause) {
              // import z from 'zod'
              if (clause.name) zodIdentifiers.add(clause.name.text);
              // import { z } from 'zod'
              if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
                for (const specifier of clause.namedBindings.elements) {
                  zodIdentifiers.add(specifier.name.text);
                }
              }
              // import * as z from 'zod'
              if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
                zodIdentifiers.add(clause.namedBindings.name.text);
              }
            }
          }
        }
        ts.forEachChild(node, collectImports);
      };
      collectImports(sourceFile);

      // ── VAL-ARC-002: Emit finding if business layer has direct axios import ──
      if (hasDirectAxiosImport && !isExcludedFromArc002(n) && isBusinessLayer(n)) {
        const snippetLine = Math.max(0, axiosImportLine - 1);
        warnings.push({
          file,
          line: axiosImportLine,
          rule: 'VAL-ARC-002',
          severity: 'WARNING',
          snippet: lines[snippetLine]?.trim(),
          message: `Direct 'import axios from "axios"' in business layer "${path.basename(path.dirname(file))}/${path.basename(file)}". ` +
            `Route HTTP calls through the approved API client wrapper (e.g. apiClient, adminApiClient) instead.`,
        });
      }

      // ── AST walk: VAL-ARC-001, VAL-ARC-004 ──────────────────────────────
      const shouldCheckArc001 = !isExcludedFromArc001(n);
      const shouldCheckArc004 = !isExcludedFromArc004(n) && zodIdentifiers.size > 0;

      if (!shouldCheckArc001 && !shouldCheckArc004) continue;

      const visit = (node: ts.Node) => {
        // ── VAL-ARC-001: console.<method>() in server production code ────────
        if (shouldCheckArc001 && ts.isCallExpression(node) && isConsoleCall(node)) {
          const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
          const methodName = (
            (node.expression as ts.PropertyAccessExpression).name.text
          );
          warnings.push({
            file,
            line: line + 1,
            rule: 'VAL-ARC-001',
            severity: 'WARNING',
            snippet: lines[line]?.trim(),
            message: `console.${methodName}() used in server production code. ` +
              `Use the approved logger (import { logger } from '../../utils/logger') instead.`,
          });
        }

        // ── VAL-ARC-004: Local Zod schema in non-validation app code ─────────
        if (shouldCheckArc004 && ts.isCallExpression(node) && isZodCall(node, zodIdentifiers)) {
          const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
          const methodName = (
            (node.expression as ts.PropertyAccessExpression).name.text
          );
          warnings.push({
            file,
            line: line + 1,
            rule: 'VAL-ARC-004',
            severity: 'WARNING',
            snippet: lines[line]?.trim(),
            message: `Local Zod schema (z.${methodName}()) declared outside the shared validation package. ` +
              `Move this schema to 'packages/validations/src/' and re-export it from '@mad/validations'.`,
          });
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    }

    return {
      name: this.name,
      success: errors.filter(e => e.severity === 'ERROR' || e.severity === 'CRITICAL').length === 0,
      errors,
      warnings,
      statistics: {
        filesProcessed: tsFiles.length,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }
}
