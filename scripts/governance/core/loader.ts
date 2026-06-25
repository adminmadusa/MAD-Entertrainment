// scripts/governance/core/loader.ts

import { GovernanceValidator } from './validator';
import { ValidationResult } from './types';

export class ValidatorLoader {
  private validators: GovernanceValidator[] = [];

  public register(validator: GovernanceValidator): void {
    this.validators.push(validator);
  }

  public registerAll(validators: GovernanceValidator[]): void {
    validators.forEach(v => this.register(v));
  }

  public async runAll(files: string[], metadata: any): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const validator of this.validators) {
      const startTime = Date.now();
      try {
        const result = await validator.run(files, metadata);
        results.push(result);
      } catch (err: any) {
        results.push({
          name: validator.name,
          success: false,
          executionTimeMs: Date.now() - startTime,
          statistics: {},
          errors: [
            {
              file: 'N/A',
              rule: 'Validator Crash',
              severity: 'ERROR',
              message: `Validator ${validator.name} crashed with error: ${err?.message || err}`,
            },
          ],
          warnings: [],
        });
      }
    }

    return results;
  }
}
