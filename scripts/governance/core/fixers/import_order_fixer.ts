import { Fixer, FixResultItem } from '../fix_types';
import { FixContext } from '../fix_context';
import { StatelessViolation } from '../types';

export class ImportOrderFixer implements Fixer {
  readonly ruleId = 'VAL-HYG-001';
  readonly safety = 'MANUAL';

  async fix(violation: StatelessViolation, context: FixContext): Promise<FixResultItem> {
    return {
      ruleId: this.ruleId,
      filePath: violation.path,
      success: false,
      message: 'Import ordering is classified as MANUAL and requires developer review',
      safety: this.safety,
      applied: false,
    };
  }
}
