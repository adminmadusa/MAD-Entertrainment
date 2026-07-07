// scripts/governance/validators/performance_validator.ts
//
// Detects Performance governance violations:
//   VAL-PFM-001 — Optimize Font Loading
//   VAL-PFM-002 — Avoid Render-Blocking Resources
//
// False Positive Policy
// ─────────────────────
// Before reporting a finding the validator verifies:
//   • File is production Next.js code (not a test, fixture, script, email template,
//     migration, documentation, or generated file).
//   • The detected pattern is not an internal/bundled resource.
//   • The pattern is not an approved framework construct (JSON-LD script tags,
//     Next.js Metadata API, internal CSS imports, React Email components).
//   • The detected `href`/`src` attribute points to an external http(s) URL.
//
// When uncertainty exists, the finding is suppressed.
//
// Approved Repository Exceptions (never flagged):
//   • apps/server/src/lib/email/templates/**  — React Email server renderer
//   • apps/server/src/app.ts                  — CSP header string, not HTML
//   • *.test.ts / *.spec.ts                   — test files
//   • scripts/**                              — tooling / governance scripts
//   • docs/**                                 — documentation
//   • .governance/**                          — generated baseline files
//
// Cache Integration
// ─────────────────
// All file reads go through FileContentCache.
// All TS/TSX AST parses go through ASTParserCache.
// No direct fs.readFileSync or ts.createSourceFile calls.

import * as ts from 'typescript';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';
import { FileContentCache, ASTParserCache } from '../core/ast_parser_cache';

// ─── Path exclusion helpers ────────────────────────────────────────────

const EXCLUDED_PATH_FRAGMENTS = [
  // Server-side email renderer — approved exception for fonts.gstatic.com
  '/email/templates/',
  'email/templates/',
  // CSP config string in app.ts — not HTML
  'apps/server/src/app.ts',
  // Test / spec files
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
  // Governance tooling and scripts
  'scripts/governance/',
  // Documentation
  'docs/',
  // Generated governance baselines
  '.governance/',
  // Fixtures / examples in agent skills
  '.agents/',
  // Next.js generated env declaration
  'next-env.d.ts',
];

function isExcluded(file: string): boolean {
  const normalized = file.replace(/\\/g, '/');
  return EXCLUDED_PATH_FRAGMENTS.some(frag => normalized.includes(frag));
}

// ─── External URL helpers ──────────────────────────────────────────────

function isExternalHttpUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

function isGoogleFontUrl(value: string): boolean {
  return value.includes('fonts.googleapis.com') || value.includes('fonts.gstatic.com');
}

// ─── AST attribute helpers ─────────────────────────────────────────────

/** Resolve the string literal value of a JSX attribute value node. */
function getJsxAttrStringValue(initializer: ts.JsxAttributeValue | undefined): string | null {
  if (!initializer) return null;
  if (ts.isStringLiteral(initializer)) return initializer.text;
  if (ts.isJsxExpression(initializer) && initializer.expression) {
    const expr = initializer.expression;
    if (ts.isStringLiteral(expr)) return expr.text;
    if (ts.isTemplateExpression(expr)) return null; // dynamic, skip
  }
  return null;
}

/** Check whether a JSX opening element has a given boolean prop (e.g. `async` / `defer`). */
function hasJsxBooleanAttr(attrs: ts.JsxAttributes, propName: string): boolean {
  for (const attr of attrs.properties) {
    if (ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name)) {
      if (attr.name.text === propName) return true;
    }
  }
  return false;
}

/** Get the value of a string JSX attribute. */
function getJsxAttrValue(attrs: ts.JsxAttributes, propName: string): string | null {
  for (const attr of attrs.properties) {
    if (ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name) && attr.name.text === propName) {
      return getJsxAttrStringValue(attr.initializer);
    }
  }
  return null;
}

/** Get the text of a JSX tag name (handles identifier and property access). */
function getJsxTagName(tag: ts.JsxTagNameExpression): string {
  if (ts.isIdentifier(tag)) return tag.text;
  if (ts.isPropertyAccessExpression(tag)) return tag.name.text;
  return '';
}

// ─── Font initialization helpers ──────────────────────────────────────

/** Returns true when a call expression is a next/font initializer without display:'swap'. */
function isFontCallWithoutSwap(node: ts.CallExpression, fontIdentifiers: Set<string>): boolean {
  const expr = node.expression;
  if (!ts.isIdentifier(expr)) return false;
  if (!fontIdentifiers.has(expr.text)) return false;

  // Check the first argument object literal for `display` property.
  const arg = node.arguments[0];
  if (!arg || !ts.isObjectLiteralExpression(arg)) {
    // Called with no options — missing display: 'swap'
    return true;
  }

  for (const prop of arg.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === 'display'
    ) {
      const val = prop.initializer;
      if (ts.isStringLiteral(val) && val.text === 'swap') return false;
      return true; // display is set to something other than 'swap'
    }
  }
  // display key not found at all
  return true;
}

// ─── Validator ─────────────────────────────────────────────────────────

export class PerformanceValidator implements GovernanceValidator {
  readonly name = 'PerformanceValidator';

  public async run(files: string[], _metadata: unknown): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Filter to production TSX/TS files only
    const targetFiles = files.filter(f => {
      const normalized = f.replace(/\\/g, '/');
      return (
        (normalized.endsWith('.tsx') || normalized.endsWith('.ts')) &&
        !isExcluded(normalized)
      );
    });

    for (const file of targetFiles) {
      const normalized = file.replace(/\\/g, '/');

      const content = FileContentCache.getFileContent(normalized);
      if (content === null) continue;

      const sourceFile = ASTParserCache.getSourceFile(normalized);
      if (!sourceFile) continue;

      const lines = content.split('\n');

      // ── Collect all `next/font` imported identifiers ─────────────────
      // e.g. `import { Outfit, Inter } from 'next/font/google'`
      //       → fontIdentifiers = Set { 'Outfit', 'Inter' }
      const fontIdentifiers = new Set<string>();
      let fontInitializationCount = 0;

      const findImports = (node: ts.Node) => {
        if (
          ts.isImportDeclaration(node) &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const mod = node.moduleSpecifier.text;
          if (mod === 'next/font/google' || mod === 'next/font/local') {
            const clause = node.importClause;
            if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
              for (const specifier of clause.namedBindings.elements) {
                fontIdentifiers.add(specifier.name.text);
              }
            }
          }
        }
        ts.forEachChild(node, findImports);
      };
      findImports(sourceFile);

      // ── Walk the AST for violations ────────────────────────────────────
      const visit = (node: ts.Node) => {
        // ── VAL-PFM-001: Check font call without display:'swap' ──────────
        if (fontIdentifiers.size > 0 && ts.isCallExpression(node)) {
          if (isFontCallWithoutSwap(node, fontIdentifiers)) {
            const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
            warnings.push({
              file,
              line: line + 1,
              rule: 'VAL-PFM-001',
              severity: 'WARNING',
              snippet: lines[line]?.trim(),
              message: `Font initialized without display: 'swap'. Add display: 'swap' to prevent layout shifts.`,
            });
          }

          // Count distinct font initializations in this file
          const expr = node.expression;
          if (ts.isIdentifier(expr) && fontIdentifiers.has(expr.text)) {
            fontInitializationCount++;
            if (fontInitializationCount > 1) {
              const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
              warnings.push({
                file,
                line: line + 1,
                rule: 'VAL-PFM-001',
                severity: 'WARNING',
                snippet: lines[line]?.trim(),
                message: `Duplicate font initialization detected. Initialize each font exactly once, preferably in the root layout.`,
              });
            }
          }
        }

        // ── VAL-PFM-001: JSX <link href="https://fonts.googleapis.com/..."> ──
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tagName = getJsxTagName(
            ts.isJsxOpeningElement(node) ? node.tagName : node.tagName
          );
          const attrs = ts.isJsxOpeningElement(node) ? node.attributes : node.attributes;

          if (tagName === 'link') {
            const rel = getJsxAttrValue(attrs, 'rel');
            const href = getJsxAttrValue(attrs, 'href');

            if (href && isGoogleFontUrl(href)) {
              const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
              warnings.push({
                file,
                line: line + 1,
                rule: 'VAL-PFM-001',
                severity: 'WARNING',
                snippet: lines[line]?.trim(),
                message: `External Google Fonts <link> detected. Use 'next/font/google' with display: 'swap' instead to avoid render-blocking layout shifts.`,
              });
            }

            // ── VAL-PFM-002: <link rel="stylesheet" href="https://..."> external CSS ──
            if (rel === 'stylesheet' && href && isExternalHttpUrl(href) && !isGoogleFontUrl(href)) {
              const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
              warnings.push({
                file,
                line: line + 1,
                rule: 'VAL-PFM-002',
                severity: 'WARNING',
                snippet: lines[line]?.trim(),
                message: `External blocking stylesheet detected (href="${href}"). Import CSS via the bundler or use next/script with an appropriate strategy.`,
              });
            }

            // ── VAL-PFM-002: <link rel="preload" as="style" href="https://..."> ──
            if (rel === 'preload' && href && isExternalHttpUrl(href)) {
              const asAttr = getJsxAttrValue(attrs, 'as');
              if (asAttr === 'style') {
                const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
                warnings.push({
                  file,
                  line: line + 1,
                  rule: 'VAL-PFM-002',
                  severity: 'WARNING',
                  snippet: lines[line]?.trim(),
                  message: `Preloading external CSS resource detected (href="${href}"). Avoid externally sourced stylesheets to prevent render-blocking.`,
                });
              }
            }
          }

          // ── VAL-PFM-002: <script src="https://..."> without async/defer ──
          if (tagName === 'script') {
            const src = getJsxAttrValue(attrs, 'src');
            const type = getJsxAttrValue(attrs, 'type');

            // JSON-LD structured data is an approved pattern — never flag
            if (type === 'application/ld+json') {
              ts.forEachChild(node, visit);
              return;
            }

            if (src && isExternalHttpUrl(src)) {
              const hasAsync = hasJsxBooleanAttr(attrs, 'async');
              const hasDefer = hasJsxBooleanAttr(attrs, 'defer');

              if (!hasAsync && !hasDefer) {
                const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
                warnings.push({
                  file,
                  line: line + 1,
                  rule: 'VAL-PFM-002',
                  severity: 'WARNING',
                  snippet: lines[line]?.trim(),
                  message: `Synchronous external script detected (src="${src}"). Add async or defer attribute, or use next/script with strategy="lazyOnload".`,
                });
              }
            }
          }
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
        filesProcessed: targetFiles.length,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }
}
