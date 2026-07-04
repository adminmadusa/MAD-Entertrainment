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
            const valuePart = line.substring(colonIndex + 1);
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

      // AST Walker for Rules
      const walk = (node: ts.Node) => {
        // Rule 1: VAL-UI-007 - Hardcoded Colors (Hex colors check)
        const isEmailOrPdfTemplate =
          file.includes('apps/server/src/lib/email/templates') ||
          file.includes('apps/server/src/lib/pdf/ticket') ||
          // Next.js global error boundaries must use inline styles — CSS design tokens are unavailable
          file.endsWith('global-error.tsx');
        if (!isEmailOrPdfTemplate && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
          const text = node.text;
          const exactHexPattern = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
          if (exactHexPattern.test(text)) {
            let shouldReport = false;
            if (isTailwindConfig) {
              shouldReport = true;
            } else if (isInsideJsxStyle(node) || isInsideThemeDefinition(node)) {
              shouldReport = true;
            }

            if (shouldReport) {
              const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
              const supp = checkSuppression(lines, line, 'VAL-UI-007');
              if (supp.isSuppressed) {
                warnings.push({
                  file,
                  line: line + 1,
                  rule: 'VAL-UI-007',
                  severity: 'WARNING',
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
                  rule: 'VAL-UI-007',
                  severity: 'WARNING',
                  snippet: lines[line]?.trim(),
                  message: `Hardcoded color '${text}' detected. Standardize using design tokens/theme variables.${note}`,
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
