import { Fixer, FixResultItem } from '../fix_types';
import { FixContext } from '../fix_context';
import { StatelessViolation } from '../types';

export class TypeImportFixer implements Fixer {
  readonly ruleId = 'VAL-HYG-003';
  readonly safety = 'MANUAL';

  async fix(violation: StatelessViolation, context: FixContext): Promise<FixResultItem> {
    return {
      ruleId: this.ruleId,
      filePath: violation.path,
      success: false,
      message: 'Type imports enforcement is classified as MANUAL and requires developer review',
      safety: this.safety,
      applied: false,
    };
  }
}
