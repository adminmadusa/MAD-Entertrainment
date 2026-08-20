// scripts/governance/validators/code_quality_validator.ts
import { existsSync, readFileSync } from 'fs';
import { resolve, normalize } from 'path';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError, GovernanceMetadata } from '../core/types';
import { governanceConfig } from '../core/governance.config';

const workspaceRoot = resolve(__dirname, '../../..');

interface FileClassification {
  ruleId: string;
  category: string;
  limit: number;
  label: string;
}

export class CodeQualityValidator implements GovernanceValidator {
  readonly name = 'CodeQualityValidator';

  public async run(files: string[], _metadata: GovernanceMetadata): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const startTime = Date.now();

    const config = governanceConfig.codeQuality;
    if (!config) {
      return {
        name: this.name,
        success: true,
        errors: [],
        warnings: [],
        statistics: {},
        executionTimeMs: 0,
      };
    }

    const { thresholds, exceptions = [], enforcement } = config;
    const now = new Date();

    // Map exceptions by normalized relative path
    const exceptionMap = new Map<string, typeof exceptions[0]>();
    for (const exc of exceptions) {
      exceptionMap.set(normalize(exc.filePath).replace(/\\/g, '/'), exc);
    }

    // Filter files in scope
    const excluded = new Set((governanceConfig.scanScope.excludedPaths || []).map(p => normalize(p).replace(/\\/g, '/')));

    for (const relPath of files) {
      const normPath = normalize(relPath).replace(/\\/g, '/');

      // Skip excluded paths
      if (Array.from(excluded).some(ex => normPath.startsWith(ex) || normPath.includes(`/${ex}/`))) {
        continue;
      }

      // Skip non-code files
      if (!/\.(ts|tsx)$/.test(normPath)) {
        continue;
      }

      const fullPath = resolve(workspaceRoot, relPath);
      if (!existsSync(fullPath)) {
        continue;
      }

      let content: string;
      try {
        content = readFileSync(fullPath, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      const lineCount = lines.length;

      const classification = this.classifyFile(normPath, thresholds);
      if (!classification) {
        continue;
      }

      const { ruleId, limit, label } = classification;
      const exception = exceptionMap.get(normPath);

      if (exception && exception.ruleId === ruleId) {
        // 1. Check if exception has expired
        const expiresAt = new Date(exception.expiresAt);
        if (now > expiresAt) {
          errors.push({
            file: relPath,
            rule: ruleId,
            severity: 'ERROR',
            message: `Code Quality Exception Expired! File "${relPath}" (${lineCount} lines) was granted an exception until ${exception.expiresAt}, which has now elapsed. Owner: ${exception.owner}. Remediation is required.`,
            line: 1,
            snippet: `Exception expired: ${exception.expiresAt} (Ceiling: ${exception.maxLinesCeiling} lines)`,
          });
          continue;
        }

        // 2. Check if file exceeded its frozen ceiling
        if (lineCount > exception.maxLinesCeiling) {
          errors.push({
            file: relPath,
            rule: ruleId,
            severity: 'ERROR',
            message: `Code Quality Freeze Violation! File "${relPath}" has grown to ${lineCount} lines, exceeding its frozen exception ceiling of ${exception.maxLinesCeiling} lines. Legacy files on exception are frozen and cannot grow further.`,
            line: 1,
            snippet: `Current lines: ${lineCount} > Exception ceiling: ${exception.maxLinesCeiling}`,
          });
          continue;
        }

        // Exception is active and within frozen ceiling
        continue;
      }

      // No exception active: validate against hard limits
      if (lineCount > limit) {
        const severity = enforcement[ruleId as keyof typeof enforcement] === 'WARN' ? 'WARNING' : 'ERROR';
        const errorObj: ValidationError = {
          file: relPath,
          rule: ruleId,
          severity: severity === 'ERROR' ? 'ERROR' : 'WARNING',
          message: `${label} file size limit exceeded: "${relPath}" has ${lineCount} lines (Maximum allowed: ${limit} lines). Decompose this file into modular sub-components, custom hooks, or utility helpers.`,
          line: 1,
          snippet: `File length: ${lineCount} lines (Limit: ${limit} lines)`,
        };

        if (severity === 'ERROR') {
          errors.push(errorObj);
        } else {
          warnings.push(errorObj);
        }
      }

      // Check VAL-QUAL-008: State & Hook Overload in UI Components
      if (classification.ruleId === 'VAL-QUAL-001') {
        const stateCount = (content.match(/\buseState\s*\(/g) || []).length;
        const effectCount = (content.match(/\buseEffect\s*\(/g) || []).length;
        const totalHooks = stateCount + effectCount;

        if (totalHooks > thresholds.maxStateHooks && !exception) {
          warnings.push({
            file: relPath,
            rule: 'VAL-QUAL-008',
            severity: 'WARNING',
            message: `Single Responsibility Warning: Component "${relPath}" declares ${totalHooks} state/effect hooks (${stateCount} useState, ${effectCount} useEffect). Consider consolidating state management into a dedicated custom hook.`,
            line: 1,
            snippet: `Total state/effect hooks: ${totalHooks} (Recommended max: ${thresholds.maxStateHooks})`,
          });
        }
      }
    }

    return {
      name: this.name,
      success: errors.length === 0,
      errors,
      warnings,
      statistics: {
        totalFilesEvaluated: files.length,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  private classifyFile(
    normPath: string,
    thresholds: typeof governanceConfig['codeQuality']['thresholds']
  ): FileClassification | null {
    // 1. Test Files
    if (/\.(test|spec)\.(ts|tsx)$/.test(normPath)) {
      return {
        ruleId: 'VAL-QUAL-006',
        category: 'testing',
        limit: thresholds.testMaxLines,
        label: 'Test Suite',
      };
    }

    // 2. Custom Hooks
    if (/(^|\/)use[A-Z0-9].*\.(ts|tsx)$/.test(normPath) || normPath.includes('/hooks/')) {
      return {
        ruleId: 'VAL-QUAL-002',
        category: 'hooks',
        limit: thresholds.hookMaxLines,
        label: 'Custom Hook',
      };
    }

    // 3. Controllers
    if (normPath.includes('/controllers/') || normPath.endsWith('.controller.ts')) {
      return {
        ruleId: 'VAL-QUAL-003',
        category: 'controllers',
        limit: thresholds.controllerMaxLines,
        label: 'Controller',
      };
    }

    // 4. Services
    if (normPath.includes('/services/') || normPath.endsWith('.service.ts')) {
      return {
        ruleId: 'VAL-QUAL-004',
        category: 'services',
        limit: thresholds.serviceMaxLines,
        label: 'Backend Service',
      };
    }

    // 5. Schemas & Type definitions
    if (normPath.includes('/models/') || normPath.endsWith('.schema.ts') || normPath === 'packages/types/src/index.ts') {
      return {
        ruleId: 'VAL-QUAL-005',
        category: 'schemas',
        limit: thresholds.schemaMaxLines,
        label: 'Schema / Type Definitions',
      };
    }

    // 6. UI Components & Pages
    if (
      normPath.endsWith('.tsx') &&
      (normPath.includes('/components/') || normPath.includes('/app/') || normPath.startsWith('packages/ui/'))
    ) {
      return {
        ruleId: 'VAL-QUAL-001',
        category: 'components',
        limit: thresholds.componentMaxLines,
        label: 'UI Component / Page',
      };
    }

    return null;
  }
}
