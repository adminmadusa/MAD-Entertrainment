// scripts/governance/validators/shared_component_validator.ts
import { existsSync } from 'fs';
import { resolve } from 'path';
import * as ts from 'typescript';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';
import { governanceConfig } from '../core/governance.config';
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

      const walk = (node: ts.Node) => {
        // Detect raw HTML tags in JSX
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tagName = node.tagName.getText(sourceFile);
          const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());

          if (tagName === 'button') {
            warnings.push({
              file,
              line: line + 1,
              rule: 'VAL-UI-005',
              severity: 'WARNING',
              snippet: lines[line]?.trim(),
              message: 'Raw HTML <button> tag used. Standardize using the shared Button component from @mad/ui.',
            });
            warnings.push({
              file,
              line: line + 1,
              rule: 'VAL-UI-010',
              severity: 'WARNING',
              snippet: lines[line]?.trim(),
              message: 'Shared Component Enforcement: Bypassed shared Button component in favor of raw HTML button element.',
            });
          }

          if (tagName === 'table') {
            warnings.push({
              file,
              line: line + 1,
              rule: 'VAL-UI-004',
              severity: 'WARNING',
              snippet: lines[line]?.trim(),
              message: 'Raw <table> element used in portal. Use a reusable shared Table component.',
            });
            warnings.push({
              file,
              line: line + 1,
              rule: 'VAL-UI-010',
              severity: 'WARNING',
              snippet: lines[line]?.trim(),
              message: 'Shared Component Enforcement: Bypassed shared Table component in favor of raw HTML table element.',
            });
          }
        }

        // Detect local implementations of components named Field
        if (ts.isFunctionDeclaration(node) && node.name) {
          const name = node.name.text;
          if (name === 'Field' && file !== 'apps/admin/src/app/events/new/_components/Field.tsx') {
            const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
            warnings.push({
              file,
              line: line + 1,
              rule: 'VAL-UI-006',
              severity: 'WARNING',
              snippet: lines[line]?.trim(),
              message: 'Local duplication of <Field> wrapper. Use a shared components package.',
            });
            warnings.push({
              file,
              line: line + 1,
              rule: 'VAL-UI-010',
              severity: 'WARNING',
              snippet: lines[line]?.trim(),
              message: 'Shared Component Enforcement: Local duplication of Field component wrapper. Import Field from shared library instead.',
            });
          }
        }

        if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
          const name = node.name.text;
          if (name === 'Field' && file !== 'apps/admin/src/app/events/new/_components/Field.tsx') {
            const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
            warnings.push({
              file,
              line: line + 1,
              rule: 'VAL-UI-006',
              severity: 'WARNING',
              snippet: lines[line]?.trim(),
              message: 'Local duplication of <Field> wrapper. Use a shared components package.',
            });
            warnings.push({
              file,
              line: line + 1,
              rule: 'VAL-UI-010',
              severity: 'WARNING',
              snippet: lines[line]?.trim(),
              message: 'Shared Component Enforcement: Local duplication of Field component wrapper. Import Field from shared library instead.',
            });
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
