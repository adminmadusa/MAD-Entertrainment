// scripts/governance/validators/ux_state_validator.ts
import { existsSync } from 'fs';
import { resolve } from 'path';
import * as ts from 'typescript';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';
import { RuleRegistry } from '../rules/registry';
import { FileContentCache, ASTParserCache } from '../core/ast_parser_cache';
import { checkSuppression } from '../core/suppression';

const workspaceRoot = resolve(__dirname, '../../..');

const isStaticSource = (expr: ts.Expression, sourceFile: ts.SourceFile): boolean => {
  // 1. Literal Array
  if (ts.isArrayLiteralExpression(expr)) {
    return true;
  }

  // 2. Call Expression (static factories like Array.from, Object.keys, etc.)
  if (ts.isCallExpression(expr)) {
    const callText = expr.expression.getText(sourceFile);
    if (
      callText === 'Array.from' ||
      callText === 'Object.keys' ||
      callText === 'Object.values' ||
      callText === 'Object.entries'
    ) {
      return true;
    }
  }

  // 3. Identifier
  if (ts.isIdentifier(expr)) {
    const idName = expr.text;

    // UPPER_CASE constants
    if (/^[A-Z0-9_]+$/.test(idName)) {
      return true;
    }

    let isStaticConst = false;
    let isImported = false;

    const findDecl = (n: ts.Node) => {
      if (isStaticConst || isImported) return;

      // Check imports
      if (ts.isImportSpecifier(n) && n.name.text === idName) {
        isImported = true;
        return;
      }
      if (ts.isImportClause(n) && n.name && n.name.text === idName) {
        isImported = true;
        return;
      }
      if (ts.isNamespaceImport(n) && n.name.text === idName) {
        isImported = true;
        return;
      }

      // Check static variable declarations
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === idName) {
        if (n.initializer) {
          if (
            ts.isArrayLiteralExpression(n.initializer) ||
            ts.isObjectLiteralExpression(n.initializer) ||
            ts.isStringLiteral(n.initializer) ||
            ts.isNoSubstitutionTemplateLiteral(n.initializer) ||
            ts.isNumericLiteral(n.initializer)
          ) {
            isStaticConst = true;
            return;
          }
        }
      }

      ts.forEachChild(n, findDecl);
    };

    findDecl(sourceFile);

    if (isStaticConst || isImported) {
      return true;
    }
  }

  // 4. Property Access
  if (ts.isPropertyAccessExpression(expr)) {
    let leftmost: ts.Expression = expr.expression;
    while (ts.isPropertyAccessExpression(leftmost)) {
      leftmost = leftmost.expression;
    }
    return isStaticSource(leftmost, sourceFile);
  }

  return false;
};

export class UXStateValidator implements GovernanceValidator {
  readonly name = 'UXStateValidator';

  public async run(files: string[], metadata: any): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let parserFailures = 0;

    for (const file of files) {
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
        relPath.startsWith('packages/ui/src/');

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

      const sourceFile = ASTParserCache.getSourceFile(file);
      if (!sourceFile) {
        parserFailures++;
        continue;
      }

      const lines = content.split('\n');
      let hasUseQuery = false;
      let hasUseSWR = false;
      let hasMap = false;

      // Quick check to see if we need to run heavy AST traversals
      if (content.includes('useQuery') || content.includes('useSuspenseQuery')) {
        hasUseQuery = true;
      }
      if (content.includes('useSWR')) {
        hasUseSWR = true;
      }
      if (content.includes('.map(')) {
        hasMap = true;
      }

      if (!hasUseQuery && !hasUseSWR && !hasMap) {
        continue;
      }

      const walk = (node: ts.Node) => {
        // Check VAL-UX-001 (loading) and VAL-UX-003 (error) for useQuery/useSWR
        if (ts.isCallExpression(node)) {
          const expText = node.expression.getText(sourceFile);
          if (['useQuery', 'useSuspenseQuery', 'useSWR'].includes(expText)) {
            let parent = node.parent;
            let hasLoadingCheck = false;
            let hasErrorCheck = false;

            // 1. Check destructuring, e.g. const { isLoading, isError } = useQuery(...)
            if (parent && ts.isVariableDeclaration(parent) && parent.name && ts.isObjectBindingPattern(parent.name)) {
              for (const element of parent.name.elements) {
                if (element.name && ts.isIdentifier(element.name)) {
                  const propName = element.propertyName
                    ? element.propertyName.getText(sourceFile)
                    : element.name.text;
                  if (['isLoading', 'isPending', 'status', 'loading'].includes(propName)) {
                    hasLoadingCheck = true;
                  }
                  if (['isError', 'error', 'status'].includes(propName)) {
                    hasErrorCheck = true;
                  }
                }
              }
            }

            // 2. Check variable assignment, e.g. const query = useQuery(...)
            if (parent && ts.isVariableDeclaration(parent) && parent.name && ts.isIdentifier(parent.name)) {
              const varName = parent.name.text;
              // Check if the rest of the file references query.isLoading or query.isError
              const queryText = sourceFile.text;
              if (
                queryText.includes(`${varName}.isLoading`) ||
                queryText.includes(`${varName}.isPending`) ||
                queryText.includes(`${varName}.status`) ||
                queryText.includes(`${varName}.loading`)
              ) {
                hasLoadingCheck = true;
              }
              if (
                queryText.includes(`${varName}.isError`) ||
                queryText.includes(`${varName}.error`) ||
                queryText.includes(`${varName}.status`)
              ) {
                hasErrorCheck = true;
              }
            }

            // Suspense queries handle loading/error at the boundary level automatically
            if (expText === 'useSuspenseQuery') {
              hasLoadingCheck = true;
              hasErrorCheck = true;
            }

            // Report loading violation
            if (!hasLoadingCheck) {
              const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
              const supp = checkSuppression(lines, line, 'VAL-UX-001');
              if (!supp.isSuppressed) {
                const rule = RuleRegistry.getRule('VAL-UX-001');
                warnings.push({
                  file,
                  line: line + 1,
                  rule: 'VAL-UX-001',
                  severity: (rule?.severity as any) || 'HIGH',
                  snippet: lines[line]?.trim(),
                  message: 'Component uses async data fetching but is missing a loading state check.',
                });
              }
            }

            // Report error violation
            if (!hasErrorCheck) {
              const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
              const supp = checkSuppression(lines, line, 'VAL-UX-003');
              if (!supp.isSuppressed) {
                const rule = RuleRegistry.getRule('VAL-UX-003');
                warnings.push({
                  file,
                  line: line + 1,
                  rule: 'VAL-UX-003',
                  severity: (rule?.severity as any) || 'HIGH',
                  snippet: lines[line]?.trim(),
                  message: 'Component uses async data fetching but is missing an error state check.',
                });
              }
            }
          }
        }

        // Check VAL-UX-002 (empty state) for map rendering
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
          const propName = node.expression.name.text;
          if (propName === 'map') {
            const callerExpr = node.expression.expression;
            const callerText = callerExpr.getText(sourceFile);

            // Filter out static data sources to prevent false positives
            if (!isStaticSource(callerExpr, sourceFile)) {
              // Verify if callerText.length or EmptyState is present in the file
              const fileText = sourceFile.text;
              const hasLengthCheck =
                fileText.includes(`${callerText}.length`) ||
                fileText.includes('EmptyState') ||
                fileText.includes('empty');

              if (!hasLengthCheck) {
                const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
                const supp = checkSuppression(lines, line, 'VAL-UX-002');
                if (!supp.isSuppressed) {
                  const rule = RuleRegistry.getRule('VAL-UX-002');
                  warnings.push({
                    file,
                    line: line + 1,
                    rule: 'VAL-UX-002',
                    severity: (rule?.severity as any) || 'HIGH',
                    snippet: lines[line]?.trim(),
                    message: `List rendering of "${callerText}" detected via .map() without checking for empty state or rendering <EmptyState />.`,
                  });
                }
              }
            }
          }
        }

        ts.forEachChild(node, walk);
      };

      walk(sourceFile);
    }

    const duration = Date.now() - startTime;
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
