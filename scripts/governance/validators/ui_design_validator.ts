// scripts/governance/validators/ui_design_validator.ts
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError, StatelessViolation } from '../core/types';

const workspaceRoot = resolve(__dirname, '../../..');

export class UIDesignValidator implements GovernanceValidator {
  readonly name = 'UIDesignValidator';

  public async run(files: string[], metadata: any): Promise<ValidationResult> {
    const startTime = Date.now();
    const violations = this.getStatelessViolations(files);

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    for (const v of violations) {
      const err: ValidationError = {
        file: v.path,
        line: v.line,
        rule: v.rule,
        severity: v.rule === 'VAL-UI-002' || v.rule === 'VAL-UI-003' ? 'ERROR' : 'WARNING',
        snippet: v.snippet,
        message: v.message,
      };

      if (err.severity === 'ERROR') {
        errors.push(err);
      } else {
        warnings.push(err);
      }
    }

    return {
      name: this.name,
      success: errors.length === 0,
      errors,
      warnings,
      statistics: {
        violationsFound: violations.length,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Evaluates the files statelessly and returns normalized violations.
   */
  public getStatelessViolations(files: string[]): StatelessViolation[] {
    const violations: StatelessViolation[] = [];

    for (const file of files) {
      const fullPath = resolve(workspaceRoot, file);
      if (!existsSync(fullPath)) continue;

      const content = readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      // Skip test files
      if (file.endsWith('.test.tsx') || file.endsWith('.test.ts')) {
        continue;
      }

      // Check 1: VAL-UI-006 - Field layout wrapper check
      const isOfficialField = file === 'apps/admin/src/app/events/new/_components/Field.tsx';
      if (!isOfficialField && (content.includes('function Field') || content.includes('const Field ='))) {
        const lineIdx = lines.findIndex(l => l.includes('function Field') || l.includes('const Field ='));
        violations.push({
          rule: 'VAL-UI-006',
          path: file,
          construct: 'Field',
          line: lineIdx >= 0 ? lineIdx + 1 : undefined,
          snippet: lineIdx >= 0 ? lines[lineIdx].trim() : undefined,
          message: 'Local duplication of <Field> wrapper. Use a shared components package.',
          confidence: 0.95,
        });
      }

      // Check 2: VAL-UI-004 - Table abstraction check (admin app only)
      if (file.includes('apps/admin/src') && content.includes('<table')) {
        const lineIdx = lines.findIndex(l => l.includes('<table'));
        violations.push({
          rule: 'VAL-UI-004',
          path: file,
          construct: 'table',
          line: lineIdx >= 0 ? lineIdx + 1 : undefined,
          snippet: lineIdx >= 0 ? lines[lineIdx].trim() : undefined,
          message: 'Raw <table> element used in admin portal. Use a reusable shared Table component.',
          confidence: 0.90,
        });
      }

      // Check 3: VAL-UI-005 - Button styling check (admin app only)
      if (file.includes('apps/admin/src') && content.includes('<button') && !file.includes('AdminSidebar.tsx') && !file.includes('AdminShell.tsx')) {
        const lineIdx = lines.findIndex(l => l.includes('<button'));
        violations.push({
          rule: 'VAL-UI-005',
          path: file,
          construct: 'button',
          line: lineIdx >= 0 ? lineIdx + 1 : undefined,
          snippet: lineIdx >= 0 ? lines[lineIdx].trim() : undefined,
          message: 'Raw HTML <button> tag used. Standardize using the shared Button component from @mad/ui.',
          confidence: 0.85,
        });
      }

      // Check 4: Modal Backdrop overlays (VAL-UI-001 / VAL-UI-002 / VAL-UI-003)
      if (content.includes('backdrop-blur-sm') && content.includes('fixed inset-0')) {
        const lineIdx = lines.findIndex(l => l.includes('fixed inset-0') && l.includes('backdrop-blur-sm'));
        const hasSharedModalImport = content.includes("import { Modal } from '@mad/ui'") || content.includes("import Modal");
        const hasAriaDialog = content.includes('role="dialog"') || content.includes("role='dialog'");

        if (!hasSharedModalImport) {
          // Custom modal definition
          violations.push({
            rule: 'VAL-UI-002',
            path: file,
            construct: 'modal-backdrop',
            line: lineIdx >= 0 ? lineIdx + 1 : undefined,
            snippet: lineIdx >= 0 ? lines[lineIdx].trim() : undefined,
            message: 'Custom backdrop & modal container coded. Use shared <Modal> component from @mad/ui to avoid styles drift.',
            confidence: 1.0,
          });

          if (!hasAriaDialog) {
            // Missing accessibility
            violations.push({
              rule: 'VAL-UI-003',
              path: file,
              construct: 'modal-accessibility',
              line: lineIdx >= 0 ? lineIdx + 1 : undefined,
              snippet: lineIdx >= 0 ? lines[lineIdx].trim() : undefined,
              message: 'Custom modal backdrop is missing role="dialog" or aria-modal="true" accessibility tags.',
              confidence: 1.0,
            });
          }
        }
      }
    }

    return violations;
  }
}
export const uiDesignValidatorVersion = '1.0.0';
