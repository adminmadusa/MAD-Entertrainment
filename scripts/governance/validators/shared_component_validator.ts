// scripts/governance/validators/shared_component_validator.ts
import { existsSync } from 'fs';
import { resolve } from 'path';
import * as ts from 'typescript';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';
import { governanceConfig } from '../core/governance.config';
import { FileContentCache, ASTParserCache } from '../core/ast_parser_cache';
import { checkSuppression } from '../core/suppression';

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

export class SharedComponentValidator implements GovernanceValidator {
  readonly name = 'SharedComponentValidator';

  public async run(files: string[], metadata: any): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let parserFailures = 0;

    const scopes = governanceConfig.sharedComponentScopes;
    const ignorePatterns = governanceConfig.sharedComponentEnforcement.ignoreFiles;

    for (const file of files) {
      // Scope validation
      const isInScope = scopes.some(scope => file.startsWith(scope));
      if (!isInScope) continue;

      // Ignore patterns check
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

      const reportWarning = (line: number, ruleId: string, baseMessage: string) => {
        const supp = checkSuppression(lines, line, ruleId);
        if (supp.isSuppressed) {
          warnings.push({
            file,
            line: line + 1,
            rule: ruleId,
            severity: 'WARNING',
            snippet: lines[line]?.trim(),
            message: `[SUPPRESSED] ${baseMessage} Justification: ${supp.justification}`,
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
            severity: 'WARNING',
            snippet: lines[line]?.trim(),
            message: `${baseMessage}${note}`,
          });
        }
      };

      const walk = (node: ts.Node) => {
        // Detect raw HTML tags in JSX
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tagName = node.tagName.getText(sourceFile);
          const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());

          if (tagName === 'button') {
            reportWarning(line, 'VAL-UI-005', 'Raw HTML <button> tag used. Standardize using the shared Button component from @mad/ui. (Related Rule: VAL-UI-010)');
          }

          if (tagName === 'table') {
            reportWarning(line, 'VAL-UI-004', 'Raw <table> element used in portal. Use a reusable shared Table component. (Related Rule: VAL-UI-010)');
          }
        }

        // Detect local implementations of components named Field
        if (ts.isFunctionDeclaration(node) && node.name) {
          const name = node.name.text;
          if (name === 'Field' && file !== 'apps/admin/src/app/events/new/_components/Field.tsx') {
            const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
            reportWarning(line, 'VAL-UI-006', 'Local duplication of <Field> wrapper. Use a shared components package. (Related Rule: VAL-UI-010)');
          }
        }

        if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
          const name = node.name.text;
          if (name === 'Field' && file !== 'apps/admin/src/app/events/new/_components/Field.tsx') {
            const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
            reportWarning(line, 'VAL-UI-006', 'Local duplication of <Field> wrapper. Use a shared components package. (Related Rule: VAL-UI-010)');
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
          message: `AST traversal crashed inside shared component validator: ${err?.message || err}`,
        });
      }
    }

    const duration = Date.now() - startTime;
    if (duration > 300) {
      console.warn(`[PERF ALERT] SharedComponentValidator execution took ${duration}ms, exceeding budget of 300ms.`);
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
