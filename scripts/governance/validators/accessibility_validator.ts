// scripts/governance/validators/accessibility_validator.ts
import { existsSync } from 'fs';
import { resolve } from 'path';
import * as ts from 'typescript';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';
import { governanceConfig } from '../core/governance.config';
import { RuleRegistry } from '../rules/registry';
import { FileContentCache, ASTParserCache } from '../core/ast_parser_cache';

const workspaceRoot = resolve(__dirname, '../../..');

function matchesIgnorePattern(file: string, patterns: string[]): boolean {
  const normalizedFile = file.replace(/\\/g, '/');
  return patterns.some(pattern => {
    const regexStr = '^' + pattern
      .replace(/\//g, '\\/')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^\\/]*') + '$';
    return new RegExp(regexStr).test(normalizedFile) || normalizedFile.includes(pattern.replace(/\*\*\//, ''));
  });
}

export class AccessibilityValidator implements GovernanceValidator {
  readonly name = 'AccessibilityValidator';

  public async run(files: string[], metadata: any): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let parserFailures = 0;

    const ignorePatterns = governanceConfig.sharedComponentEnforcement.ignoreFiles;

    for (const file of files) {
      if (matchesIgnorePattern(file, ignorePatterns)) {
        continue;
      }

      const fullPath = resolve(workspaceRoot, file);
      if (!existsSync(fullPath)) continue;

      if (
        file.endsWith('.test.tsx') ||
        file.endsWith('.test.ts') ||
        file.endsWith('.spec.tsx') ||
        file.endsWith('.spec.ts')
      ) {
        continue;
      }

      const content = FileContentCache.getFileContent(file);
      if (content === null) {
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

      const lines = content.split('\n');
      const hasSharedModalImport =
        content.includes("import { Modal } from '@mad/ui'") ||
        content.includes("import Modal");

      const walk = (node: ts.Node) => {
        // Find custom modal backdrop elements
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          let classNameVal = '';
          let hasRoleDialog = false;
          let hasAriaModal = false;
          let hasOnClick = false;
          let hasTabIndex = false;
          let hasRole = false;

          if (node.attributes && node.attributes.properties) {
            for (const prop of node.attributes.properties) {
              if (ts.isJsxAttribute(prop)) {
                const name = prop.name.getText(sourceFile);
                const val = prop.initializer;

                if (name === 'className' && val && ts.isStringLiteral(val)) {
                  classNameVal = val.text;
                } else if (name === 'className' && val && ts.isJsxExpression(val)) {
                  classNameVal = val.getText(sourceFile);
                }

                if (name === 'role') {
                  hasRole = true;
                  if (val && ts.isStringLiteral(val) && val.text === 'dialog') {
                    hasRoleDialog = true;
                  }
                }
                if (name === 'aria-modal') {
                  if (val && ts.isStringLiteral(val) && val.text === 'true') {
                    hasAriaModal = true;
                  } else if (val && ts.isJsxExpression(val) && val.expression?.getText(sourceFile) === 'true') {
                    hasAriaModal = true;
                  }
                }
                if (name === 'onClick') {
                  hasOnClick = true;
                }
                if (name === 'tabIndex') {
                  hasTabIndex = true;
                }
              }
            }
          }

          const tagName = node.tagName.getText(sourceFile);

          // Rule: VAL-UI-002 & VAL-UI-003 - Custom Modal backdrop checks
          if (
            tagName === 'div' &&
            classNameVal.includes('fixed') &&
            classNameVal.includes('backdrop-blur-sm')
          ) {
            const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());

            if (!hasSharedModalImport) {
              const rule002 = RuleRegistry.getRule('VAL-UI-002');
              const severity002 = rule002?.severity || 'ERROR';
              const targetArray002 = severity002 === 'ERROR' ? errors : warnings;

              targetArray002.push({
                file,
                line: line + 1,
                rule: 'VAL-UI-002',
                severity: severity002,
                snippet: lines[line]?.trim(),
                message: 'Custom backdrop & modal container coded. Use shared <Modal> component from @mad/ui to avoid styles drift.',
              });

              if (!hasRoleDialog && !hasAriaModal) {
                const rule003 = RuleRegistry.getRule('VAL-UI-003');
                const severity003 = rule003?.severity || 'ERROR';
                const targetArray003 = severity003 === 'ERROR' ? errors : warnings;

                targetArray003.push({
                  file,
                  line: line + 1,
                  rule: 'VAL-UI-003',
                  severity: severity003,
                  snippet: lines[line]?.trim(),
                  message: 'Custom modal backdrop is missing role="dialog" or aria-modal="true" accessibility tags.',
                });
              }
            }
          }

          // Rule: VAL-UI-009 - Interactive elements accessibility checks
          // Check if elements with onClick onClick handlers are accessible
          if (hasOnClick && tagName !== 'button' && tagName !== 'a' && !tagName.match(/^[A-Z]/)) {
            const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
            if (!hasTabIndex || !hasRole) {
              warnings.push({
                file,
                line: line + 1,
                rule: 'VAL-UI-009',
                severity: 'WARNING',
                snippet: lines[line]?.trim(),
                message: `Element <${tagName}> with click handler lacks a tabIndex or role attribute, breaking keyboard accessibility.`,
              });
            }
          }
        }

        ts.forEachChild(node, walk);
      };

      try {
        walk(sourceFile);
      } catch (err: any) {
        parserFailures++;
        warnings.push({
          file,
          line: 1,
          rule: 'AST-PARSE-WARNING',
          severity: 'WARNING',
          message: `AST traversal crashed inside accessibility validator: ${err?.message || err}`,
        });
      }
    }

    const duration = Date.now() - startTime;
    if (duration > 200) {
      console.warn(`[PERF ALERT] AccessibilityValidator execution took ${duration}ms, exceeding budget of 200ms.`);
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
