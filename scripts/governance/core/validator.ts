// scripts/governance/core/validator.ts

import { ValidationResult } from './types';

export interface GovernanceValidator {
  readonly name: string;
  run(files: string[], metadata: any): Promise<ValidationResult>;
}
