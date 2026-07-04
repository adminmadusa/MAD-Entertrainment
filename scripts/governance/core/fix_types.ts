import { StatelessViolation } from './types';
import { FixContext } from './fix_context';

export type SafetyLevel = 'SAFE' | 'MANUAL' | 'UNSUPPORTED';

export interface Fixer {
  readonly ruleId: string;
  readonly safety: SafetyLevel;
  fix(violation: StatelessViolation, context: FixContext): Promise<FixResultItem>;
}

export interface FixResultItem {
  readonly ruleId: string;
  readonly filePath: string;
  readonly success: boolean;
  readonly message: string;
  readonly safety: SafetyLevel;
  readonly applied: boolean;
  readonly originalContent?: string;
  readonly fixedContent?: string;
  readonly error?: Error;
}
