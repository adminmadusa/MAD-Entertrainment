// scripts/governance/validators/documentation_validator.ts

import { existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError, GovernanceMetadata } from '../core/types';

const workspaceRoot = resolve(__dirname, '../../..');

export class DocumentationValidator implements GovernanceValidator {
  readonly name = 'DocumentationValidator';

  public async run(files: string[], metadata: GovernanceMetadata): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const startTime = Date.now();
    let checkedCount = 0;

    // The required documents list is sourced from metadata.requiredDocuments
    // Plus we also check the decisions directory 'docs/decisions/' and ADR templates/indexes
    const extraRequired = [
      'docs/decisions',
      'docs/decisions/ADR_INDEX.md',
      'docs/decisions/ADR_TEMPLATE.md',
    ];

    const allRequired = Array.from(new Set([...metadata.requiredDocuments, ...extraRequired]));

    for (const relPath of allRequired) {
      const fullPath = resolve(workspaceRoot, relPath);
      checkedCount++;

      if (!existsSync(fullPath)) {
        errors.push({
          file: relPath,
          rule: 'Missing Required Documentation',
          severity: 'ERROR',
          message: `Required documentation file or directory does not exist: "${relPath}"`,
        });
      } else {
        const stats = statSync(fullPath);
        if (relPath === 'docs/decisions' && !stats.isDirectory()) {
          errors.push({
            file: relPath,
            rule: 'Malformed Documentation Structure',
            severity: 'ERROR',
            message: `Required decisions path "docs/decisions" must be a directory.`,
          });
        }
      }
    }

    return {
      name: this.name,
      success: errors.filter(e => e.severity === 'ERROR').length === 0,
      errors,
      warnings,
      statistics: {
        requiredDocumentsChecked: checkedCount,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }
}
