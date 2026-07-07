// scripts/governance/validators/ui_design_validator.ts
import { existsSync } from 'fs';
import { resolve } from 'path';
import * as ts from 'typescript';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';
import { FileContentCache, ASTParserCache } from '../core/ast_parser_cache';
import { checkSuppression } from '../core/suppression';

const workspaceRoot = resolve(__dirname, '../../..');

export class UIDesignValidator implements GovernanceValidator {
  readonly name = 'UIDesignValidator';

  public async run(files: string[], metadata: any): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let parserFailures = 0;

    for (const file of files) {
      // Skip test files
      if (
        file.endsWith('.test.tsx') ||
        file.endsWith('.test.ts') ||
        file.endsWith('.spec.tsx') ||
        file.endsWith('.spec.ts')
      ) {
        continue;
      }

      const relPath = file.replace(/\\/g, '/');
      const isAllowedFile =
        relPath.endsWith('.tsx') ||
        relPath.endsWith('.jsx') ||
        relPath.startsWith('apps/web/src/') ||
        relPath.startsWith('apps/admin/src/') ||
        relPath.startsWith('packages/ui/src/') ||
        relPath.endsWith('.css') ||
        relPath.endsWith('.scss') ||
        relPath.endsWith('tailwind.config.ts') ||
        relPath.endsWith('tailwind.config.js');

      if (!isAllowedFile) {
        continue;
      }

      const fullPath = resolve(workspaceRoot, file);
      if (!existsSync(fullPath)) {
        continue;
      }

      const content = FileContentCache.getFileContent(file);
      if (content === null) {
        continue;
      }

      const lines = content.split('\n');

      // CSS/SCSS parser bypass (regex on lines directly)
      if (relPath.endsWith('.css') || relPath.endsWith('.scss')) {
        const hexPattern = /#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
        lines.forEach((line, index) => {
          const colonIndex = line.indexOf(':');
          if (colonIndex !== -1) {
            const propertyPart = line.substring(0, colonIndex).trim();
            if (propertyPart.startsWith('--')) {
              return;
            }
            const valuePart = line.substring(colonIndex + 1);

            // VAL-UI-007 Hex checks
            const matches = valuePart.match(hexPattern);
            if (matches) {
              for (const hexMatch of matches) {
                const supp = checkSuppression(lines, index, 'VAL-UI-007');
                if (supp.isSuppressed) {
                  warnings.push({
                    file,
                    line: index + 1,
                    rule: 'VAL-UI-007',
                    severity: 'WARNING',
                    snippet: line.trim(),
                    message: `[SUPPRESSED] Hardcoded color '${hexMatch}' detected. Justification: ${supp.justification}`,
                  });
                } else {
                  let note = '';
                  if (supp.restricted) {
                    note = ' (Note: governance-ignore was rejected because inline suppression is disallowed for HIGH/CRITICAL rules.)';
                  } else if (supp.failedAttempt) {
                    note = ' (Note: governance-ignore was skipped because a valid Reason/justification comment was not found.)';
                  }
                  warnings.push({
                    file,
                    line: index + 1,
                    rule: 'VAL-UI-007',
                    severity: 'WARNING',
                    snippet: line.trim(),
                    message: `Hardcoded color '${hexMatch}' detected. Standardize using design tokens/theme variables.${note}`,
                  });
                }
              }
            }

            // VAL-UI-023: Check overflow-x: hidden on root containers in CSS
            if (line.includes('overflow-x') && line.includes('hidden')) {
              let bodyOrHtmlNearby = false;
              for (let i = Math.max(0, index - 5); i <= index; i++) {
                const prevLine = lines[i].toLowerCase();
                if (prevLine.includes('body') || prevLine.includes('html') || prevLine.includes(':root')) {
                  bodyOrHtmlNearby = true;
                  break;
                }
              }
              if (bodyOrHtmlNearby) {
                const supp = checkSuppression(lines, index, 'VAL-UI-023');
                if (!supp.isSuppressed) {
                  warnings.push({
                    file,
                    line: index + 1,
                    rule: 'VAL-UI-023',
                    severity: 'HIGH',
                    snippet: line.trim(),
                    message: 'Applying overflow-x: hidden on root body/html containers in CSS masks layout defects and is forbidden.',
                  });
                }
              }
            }
          }
        });
        continue;
      }

      const sourceFile = ASTParserCache.getSourceFile(file);
      if (!sourceFile) {
        parserFailures++;
        warnings.push({
          file,
          line: 1,
          rule: 'AST-PARSE-WARNING',
          severity: 'WARNING',
          message: `Failed to parse file AST via cache`,
        });
        continue;
      }

      const isTailwindConfig = relPath.endsWith('tailwind.config.ts') || relPath.endsWith('tailwind.config.js');

      // Helper functions for context analysis
      const isInsideJsxStyle = (node: ts.Node): boolean => {
        let parent = node.parent;
        while (parent) {
          if (ts.isJsxAttribute(parent) && parent.name.text === 'style') {
            return true;
          }
          parent = parent.parent;
        }
        return false;
      };

      const isInsideThemeDefinition = (node: ts.Node): boolean => {
        let parent = node.parent;
        while (parent) {
          if (ts.isVariableDeclaration(parent) && parent.name && ts.isIdentifier(parent.name)) {
            const varName = parent.name.text.toLowerCase();
            if (varName.includes('theme') || varName.includes('color')) {
              return true;
            }
          }
          if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
            const propName = parent.name.text;
            if (propName === 'themeColor') {
              return false; // Skip Next.js metadata themeColor
            }
            const propNameLower = propName.toLowerCase();
            if (propNameLower.includes('theme') || propNameLower.includes('color')) {
              return true;
            }
          }
          parent = parent.parent;
        }
        return false;
      };

      const isInsideArrayLiteral = (node: ts.Node): boolean => {
        let parent = node.parent;
        while (parent) {
          if (ts.isArrayLiteralExpression(parent)) {
            return true;
          }
          parent = parent.parent;
        }
        return false;
      };      // Helper to find conflicting Tailwind classes (VAL-UI-025)
      const findConflictingClasses = (classNameStr: string): string[] => {
        const classes = classNameStr.split(/\s+/).filter(Boolean);
        const seen = new Map<string, string>(); // modifierKey + ':' + category -> fullClass
        const duplicates: string[] = [];
        
        for (const c of classes) {
          const parts = c.split(':');
          const base = parts[parts.length - 1];
          const modifiers = parts.slice(0, parts.length - 1).sort().join(':');
          
          let category = '';
          if (/^(p|pt|pr|pb|pl|px|py)-/.test(base)) {
            category = 'padding-' + base.split('-')[0];
          } else if (/^(m|mt|mr|mb|ml|mx|my)-/.test(base)) {
            category = 'margin-' + base.split('-')[0];
          } else if (/^(gap|gap-x|gap-y)-/.test(base)) {
            category = 'gap-' + (base.startsWith('gap-x') ? 'x' : base.startsWith('gap-y') ? 'y' : 'all');
          } else if (base === 'flex' || base === 'grid' || base === 'block' || base === 'inline' || base === 'hidden') {
            category = 'display';
          }
          
          const exactKey = modifiers + ':' + base;
          if (seen.has(exactKey)) {
            duplicates.push(`Duplicate Tailwind class "${c}"`);
            continue;
          }
          seen.set(exactKey, c);
          
          if (category) {
            const catKey = modifiers + ':' + category;
            if (seen.has(catKey)) {
              const existing = seen.get(catKey)!;
              duplicates.push(`Conflicting Tailwind classes "${existing}" and "${c}"`);
            } else {
              seen.set(catKey, c);
            }
          }
        }
        return duplicates;
      };

      // AST Walker for Rules
      const walk = (node: ts.Node) => {
        const isEmailOrPdfTemplate =
          file.includes('apps/server/src/lib/email/templates') ||
          file.includes('apps/server/src/lib/pdf/ticket') ||
          file.endsWith('global-error.tsx');

        // Rule 1: VAL-UI-007 (Hex) & VAL-UI-022 (rgb/hsl) - Hardcoded Colors
        if (!isEmailOrPdfTemplate && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
          const text = node.text;
          const exactHexPattern = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
          const rgbHslPattern = /^(rgb|rgba|hsl|hsla)\(.*?\)$/i;
          const isHex = exactHexPattern.test(text);
          const isRgbOrHsl = rgbHslPattern.test(text);

          if (isHex || isRgbOrHsl) {
            const ruleId = isHex ? 'VAL-UI-007' : 'VAL-UI-022';
            const severity = isHex ? 'WARNING' : 'MEDIUM';
            const ruleMsg = isHex
              ? `Hardcoded color '${text}' detected. Standardize using design tokens/theme variables.`
              : `Hardcoded color '${text}' detected in JSX style. Standardize using design tokens.`;

            let shouldReport = false;
            if (isTailwindConfig) {
              shouldReport = true;
            } else if (isInsideJsxStyle(node)) {
              shouldReport = true;
            } else if (isInsideThemeDefinition(node) && !isInsideArrayLiteral(node)) {
              shouldReport = true;
            }

            if (shouldReport) {
              const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
              const supp = checkSuppression(lines, line, ruleId);
              if (supp.isSuppressed) {
                warnings.push({
                  file,
                  line: line + 1,
                  rule: ruleId,
                  severity,
                  snippet: lines[line]?.trim(),
                  message: `[SUPPRESSED] Hardcoded color '${text}' detected. Justification: ${supp.justification}`,
                });
              } else {
                let note = '';
                if (supp.restricted) {
                  note = ' (Note: governance-ignore was rejected because inline suppression is disallowed for HIGH/CRITICAL rules.)';
                } else if (supp.failedAttempt) {
                  note = ' (Note: governance-ignore was skipped because a valid Reason/justification comment was not found.)';
                }
                warnings.push({
                  file,
                  line: line + 1,
                  rule: ruleId,
                  severity,
                  snippet: lines[line]?.trim(),
                  message: `${ruleMsg}${note}`,
                });
              }
            }
          }
        }

        // Rule 3: VAL-UI-021 (Image Dimensions) & VAL-UI-023 (Overflow-X on Root element class)
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tagName = node.tagName.getText(sourceFile);

          // VAL-UI-021: Image missing explicit dimensions
          if (tagName === 'img') {
            let hasWidth = false;
            let hasHeight = false;
            node.attributes.properties.forEach(prop => {
              if (ts.isJsxAttribute(prop) && prop.name && ts.isIdentifier(prop.name)) {
                const attrName = prop.name.text;
                if (attrName === 'width') hasWidth = true;
                if (attrName === 'height') hasHeight = true;
              }
            });
            if (!hasWidth || !hasHeight) {
              const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
              const supp = checkSuppression(lines, line, 'VAL-UI-021');
              if (!supp.isSuppressed) {
                warnings.push({
                  file,
                  line: line + 1,
                  rule: 'VAL-UI-021',
                  severity: 'HIGH',
                  snippet: lines[line]?.trim(),
                  message: 'Image element <img> is missing explicit width or height attributes. Omitting dimensions causes layout shifts.',
                });
              }
            }
          }

          // VAL-UI-023: Overflow-X hidden on root containers in className
          if (tagName === 'html' || tagName === 'body') {
            node.attributes.properties.forEach(prop => {
              if (ts.isJsxAttribute(prop) && prop.name.text === 'className' && prop.initializer) {
                let classVal = '';
                if (ts.isStringLiteral(prop.initializer)) {
                  classVal = prop.initializer.text;
                } else if (ts.isJsxExpression(prop.initializer) && prop.initializer.expression && ts.isStringLiteral(prop.initializer.expression)) {
                  classVal = prop.initializer.expression.text;
                }
                if (classVal.includes('overflow-x-hidden')) {
                  const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
                  const supp = checkSuppression(lines, line, 'VAL-UI-023');
                  if (!supp.isSuppressed) {
                    warnings.push({
                      file,
                      line: line + 1,
                      rule: 'VAL-UI-023',
                      severity: 'HIGH',
                      snippet: lines[line]?.trim(),
                      message: 'Applying overflow-x: hidden on root <html>/<body> containers masks layout defects and is forbidden.',
                    });
                  }
                }
              }
            });
          }
        }

        // Rule 4: VAL-UI-024 (Tailwind Spacing) & VAL-UI-025 (Duplicate utilities) in className attributes
        if (ts.isJsxAttribute(node) && node.name.text === 'className' && node.initializer) {
          let classVal = '';
          if (ts.isStringLiteral(node.initializer)) {
            classVal = node.initializer.text;
          } else if (ts.isJsxExpression(node.initializer) && node.initializer.expression && ts.isStringLiteral(node.initializer.expression)) {
            classVal = node.initializer.expression.text;
          }

          if (classVal) {
            const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());

            // Check VAL-UI-024: Arbitrary Tailwind Spacing, e.g. mt-[17px]
            const arbitrarySpacingRegex = /\b(m|p|gap|space)(t|r|b|l|x|y)?-\[(\d+|[.\d]+)(px|rem|em|%|vh|vw)\]/g;
            let match;
            while ((match = arbitrarySpacingRegex.exec(classVal)) !== null) {
              const supp = checkSuppression(lines, line, 'VAL-UI-024');
              if (!supp.isSuppressed) {
                warnings.push({
                  file,
                  line: line + 1,
                  rule: 'VAL-UI-024',
                  severity: 'LOW',
                  snippet: lines[line]?.trim(),
                  message: `Arbitrary Tailwind spacing class "${match[0]}" detected. Standardize using design system tokens.`,
                });
              }
            }

            // Check VAL-UI-025: Duplicate Tailwind Utilities
            const conflicts = findConflictingClasses(classVal);
            if (conflicts.length > 0) {
              const supp = checkSuppression(lines, line, 'VAL-UI-025');
              if (!supp.isSuppressed) {
                warnings.push({
                  file,
                  line: line + 1,
                  rule: 'VAL-UI-025',
                  severity: 'LOW',
                  snippet: lines[line]?.trim(),
                  message: `Duplicate or conflicting Tailwind utilities found: ${conflicts.join(', ')}`,
                });
              }
            }
          }
        }

        ts.forEachChild(node, walk);
      };
      // Rule 2: VAL-UI-008 - Heading Hierarchy (h1 -> h2 -> h3 -> etc.)
      const headings: { level: number; line: number }[] = [];
      const collectHeadings = (node: ts.Node) => {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tagName = node.tagName.getText(sourceFile);
          const headingMatch = /^h([1-6])$/i.exec(tagName);
          if (headingMatch) {
            const level = parseInt(headingMatch[1], 10);
            const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
            headings.push({ level, line });
          }
        }
        ts.forEachChild(node, collectHeadings);
      };

      // Walk source file
      try {
        walk(sourceFile);
        collectHeadings(sourceFile);
      } catch (err: any) {
        parserFailures++;
        warnings.push({
          file,
          line: 1,
          rule: 'AST-PARSE-WARNING',
          severity: 'WARNING',
          message: `AST traversal crashed: ${err?.message || err}`,
        });
        continue;
      }

      // Process Heading Hierarchy
      let maxLevel = 0;
      for (const h of headings) {
        if (maxLevel > 0 && h.level > maxLevel + 1) {
          const lineIndex = h.line;
          const supp = checkSuppression(lines, lineIndex, 'VAL-UI-008');
          if (supp.isSuppressed) {
            warnings.push({
              file,
              line: h.line + 1,
              rule: 'VAL-UI-008',
              severity: 'WARNING',
              snippet: lines[h.line]?.trim(),
              message: `[SUPPRESSED] Heading level jump detected (h${h.level} after h${maxLevel}). Justification: ${supp.justification}`,
            });
          } else {
            let note = '';
            if (supp.restricted) {
              note = ' (Note: governance-ignore was rejected because inline suppression is disallowed for HIGH/CRITICAL rules.)';
            } else if (supp.failedAttempt) {
              note = ' (Note: governance-ignore was skipped because a valid Reason/justification comment was not found.)';
            }
            warnings.push({
              file,
              line: h.line + 1,
              rule: 'VAL-UI-008',
              severity: 'WARNING',
              snippet: lines[h.line]?.trim(),
              message: `Heading level jump detected (h${h.level} after h${maxLevel}). Headings must follow a strict sequential hierarchy (h1 -> h2 -> h3).${note}`,
            });
          }
        }
        maxLevel = Math.max(maxLevel, h.level);
      }
    }

    const duration = Date.now() - startTime;
    if (duration > 200) {
      console.warn(`[PERF ALERT] UIDesignValidator execution took ${duration}ms, exceeding budget of 200ms.`);
    }

    return {
      name: this.name,
      success: errors.length === 0,
      errors,
      warnings,
      statistics: {
        filesProcessed: files.length,
        parserFailures,
        durationMs: duration,
      },
      executionTimeMs: duration,
    };
  }
}
