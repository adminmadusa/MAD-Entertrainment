// scripts/governance/validators/ui_design_validator.ts
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import * as ts from 'typescript';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';

const workspaceRoot = resolve(__dirname, '../../..');

export class UIDesignValidator implements GovernanceValidator {
  readonly name = 'UIDesignValidator';

  public async run(files: string[], metadata: any): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let parserFailures = 0;

    for (const file of files) {
      const fullPath = resolve(workspaceRoot, file);
      if (!existsSync(fullPath)) continue;

      // Skip test files
      if (
        file.endsWith('.test.tsx') ||
        file.endsWith('.test.ts') ||
        file.endsWith('.spec.tsx') ||
        file.endsWith('.spec.ts')
      ) {
        continue;
      }

      let content: string;
      try {
        content = readFileSync(fullPath, 'utf8');
      } catch (err) {
        continue;
      }

      let sourceFile: ts.SourceFile;
      try {
        sourceFile = ts.createSourceFile(
          fullPath,
          content,
          ts.ScriptTarget.Latest,
          true
        );
      } catch (err: any) {
        parserFailures++;
        warnings.push({
          file,
          line: 1,
          rule: 'AST-PARSE-WARNING',
          severity: 'WARNING',
          message: `Failed to parse file AST: ${err?.message || err}`,
        });
        continue;
      }

      const lines = content.split('\n');

      // AST Walker for Rules
      const walk = (node: ts.Node) => {
        // Rule 1: VAL-UI-007 - Hardcoded Colors (Hex colors check)
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
          const text = node.text;
          const hexPattern = /#([0-9a-fA-F]{3,6}|[0-9a-fA-F]{8})\b/g;
          if (hexPattern.test(text)) {
            const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
            const hexMatch = text.match(hexPattern)?.[0];
            warnings.push({
              file,
              line: line + 1,
              rule: 'VAL-UI-007',
              severity: 'WARNING',
              snippet: lines[line]?.trim(),
              message: `Hardcoded color '${hexMatch}' detected. Standardize using design tokens/theme variables.`,
            });
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
          warnings.push({
            file,
            line: h.line + 1,
            rule: 'VAL-UI-008',
            severity: 'WARNING',
            snippet: lines[h.line]?.trim(),
            message: `Heading level jump detected (h${h.level} after h${maxLevel}). Headings must follow a strict sequential hierarchy (h1 -> h2 -> h3).`,
          });
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
