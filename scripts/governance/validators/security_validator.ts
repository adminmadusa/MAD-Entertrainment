import { existsSync } from 'fs';
import { resolve } from 'path';
import * as ts from 'typescript';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';
import { FileContentCache, ASTParserCache } from '../core/ast_parser_cache';

const workspaceRoot = resolve(__dirname, '../../..');

export class SecurityValidator implements GovernanceValidator {
  readonly name = 'SecurityValidator';

  public async run(files: string[], metadata: any): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Filter routing files only using server routing conventions
    const routeFiles = files.filter(f => {
      const normalized = f.replace(/\\/g, '/');
      return (
        normalized.includes('/routes/') &&
        normalized.endsWith('.routes.ts') &&
        !normalized.endsWith('.test.ts') &&
        !normalized.endsWith('.spec.ts')
      );
    });

    for (const file of routeFiles) {
      const fullPath = resolve(workspaceRoot, file);
      if (!existsSync(fullPath)) continue;

      const content = FileContentCache.getFileContent(file);
      if (content === null) continue;

      const sourceFile = ASTParserCache.getSourceFile(file);
      if (!sourceFile) continue;

      const lines = content.split('\n');
      const normalizedPath = file.replace(/\\/g, '/');
      const isAdminRoute = normalizedPath.includes('/routes/admin/') || normalizedPath.includes('admin.routes');

      // We walk the AST to find router declarations and HTTP method registrations.
      // 1. Detect router.use(requireAdmin/requireSuperAdmin/requireRole/requireAuth) protecting the whole file.
      let hasGlobalAdminProtection = false;
      let hasGlobalUserProtection = false;
      const adminAuthMiddlewareNames = ['requireAdmin', 'requireSuperAdmin', 'requireRole'];

      const isAdminAuthMiddleware = (node: ts.Node): boolean => {
        if (ts.isIdentifier(node)) {
          return adminAuthMiddlewareNames.includes(node.text);
        }
        if (ts.isCallExpression(node)) {
          const expression = node.expression;
          if (ts.isIdentifier(expression)) {
            return adminAuthMiddlewareNames.includes(expression.text);
          }
        }
        return false;
      };

      const hasDirectMulterUsage = (node: ts.Node): boolean => {
        if (ts.isImportDeclaration(node)) {
          const moduleSpecifier = node.moduleSpecifier;
          if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === 'multer') {
            return true;
          }
        }
        if (ts.isCallExpression(node)) {
          const expression = node.expression;
          if (ts.isIdentifier(expression) && expression.text === 'require') {
            const arg = node.arguments[0];
            if (arg && ts.isStringLiteral(arg) && arg.text === 'multer') {
              return true;
            }
          }
        }
        return false;
      };

      // Let's first scan for global file-level router.use(...) and direct multer imports
      const findGlobalMiddlewareAndMulter = (node: ts.Node) => {
        if (hasDirectMulterUsage(node)) {
          const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
          errors.push({
            file,
            line: line + 1,
            rule: 'VAL-SEC-001',
            severity: 'CRITICAL',
            snippet: lines[line]?.trim(),
            message: 'Direct use of multer configuration is forbidden. Use the standardized uploadMiddleware helper.',
          });
        }

        if (ts.isExpressionStatement(node)) {
          const expr = node.expression;
          if (ts.isCallExpression(expr)) {
            const propAccess = expr.expression;
            if (ts.isPropertyAccessExpression(propAccess)) {
              const obj = propAccess.expression;
              const prop = propAccess.name;
              if (ts.isIdentifier(obj) && obj.text === 'router' && ts.isIdentifier(prop) && prop.text === 'use') {
                for (const arg of expr.arguments) {
                  if (isAdminAuthMiddleware(arg)) {
                    hasGlobalAdminProtection = true;
                  }
                  if (ts.isIdentifier(arg) && arg.text === 'requireAuth') {
                    hasGlobalUserProtection = true;
                  }
                }
              }
            }
          }
        }
        ts.forEachChild(node, findGlobalMiddlewareAndMulter);
      };

      findGlobalMiddlewareAndMulter(sourceFile);

      // Now we inspect each route definition method (router.get, router.post, router.put, router.delete, router.patch)
      const inspectRoutes = (node: ts.Node) => {
        if (ts.isExpressionStatement(node)) {
          const expr = node.expression;
          if (ts.isCallExpression(expr)) {
            const propAccess = expr.expression;
            if (ts.isPropertyAccessExpression(propAccess)) {
              const obj = propAccess.expression;
              const prop = propAccess.name;
              const methods = ['get', 'post', 'put', 'delete', 'patch'];
              if (
                ts.isIdentifier(obj) &&
                obj.text === 'router' &&
                ts.isIdentifier(prop) &&
                methods.includes(prop.text)
              ) {
                const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
                const routePathNode = expr.arguments[0];
                let routePath = '';
                if (routePathNode && ts.isStringLiteral(routePathNode)) {
                  routePath = routePathNode.text;
                }

                // Check exceptions
                const isException = ['/login', '/forgot-password', '/reset-password'].includes(routePath);

                if (isAdminRoute && !isException && !hasGlobalAdminProtection) {
                  let hasAuth = false;
                  for (let i = 1; i < expr.arguments.length; i++) {
                    if (isAdminAuthMiddleware(expr.arguments[i])) {
                      hasAuth = true;
                      break;
                    }
                  }

                  if (!hasAuth) {
                    errors.push({
                      file,
                      line: line + 1,
                      rule: 'VAL-SEC-002',
                      severity: 'CRITICAL',
                      snippet: lines[line]?.trim(),
                      message: `Admin endpoint "${routePath || 'unknown'}" is exposed without requireAdmin or equivalent RBAC middleware.`,
                    });
                  }
                }

                // Check upload safety checks: if uploadMiddleware is used, it MUST be wrapped in requireAdmin or requireAuth
                let usesUpload = false;
                for (const arg of expr.arguments) {
                  if (ts.isCallExpression(arg)) {
                    const argExpr = arg.expression;
                    if (ts.isPropertyAccessExpression(argExpr)) {
                      const base = argExpr.expression;
                      if (ts.isIdentifier(base) && base.text === 'uploadMiddleware') {
                        usesUpload = true;
                      }
                    }
                  } else if (ts.isIdentifier(arg) && arg.text === 'uploadMiddleware') {
                    usesUpload = true;
                  }
                }

                if (usesUpload) {
                  let hasAuthOrAdmin = false;
                  for (let i = 1; i < expr.arguments.length; i++) {
                    const arg = expr.arguments[i];
                    if (isAdminAuthMiddleware(arg)) {
                      hasAuthOrAdmin = true;
                      break;
                    }
                    if (ts.isIdentifier(arg) && arg.text === 'requireAuth') {
                      hasAuthOrAdmin = true;
                      break;
                    }
                  }

                  if (hasGlobalAdminProtection || hasGlobalUserProtection) {
                    hasAuthOrAdmin = true;
                  }

                  if (!hasAuthOrAdmin) {
                    errors.push({
                      file,
                      line: line + 1,
                      rule: 'VAL-SEC-001',
                      severity: 'CRITICAL',
                      snippet: lines[line]?.trim(),
                      message: `Upload endpoint "${routePath || 'unknown'}" is exposed without authorization or authentication middleware.`,
                    });
                  }
                }
              }
            }
          }
        }
        ts.forEachChild(node, inspectRoutes);
      };

      inspectRoutes(sourceFile);
    }

    return {
      name: this.name,
      success: errors.filter(e => e.severity === 'ERROR' || e.severity === 'CRITICAL').length === 0,
      errors,
      warnings,
      statistics: {
        filesProcessed: routeFiles.length,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }
}
