import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Fixer, FixResultItem } from '../fix_types';
import { FixContext } from '../fix_context';
import { StatelessViolation } from '../types';

export class EofNewlineFixer implements Fixer {
  readonly ruleId = 'VAL-HYG-005';
  readonly safety = 'SAFE';

  async fix(violation: StatelessViolation, context: FixContext): Promise<FixResultItem> {
    const filePath = violation.path;
    const fullPath = resolve(context.workspaceRoot, filePath);
    const content = readFileSync(fullPath, 'utf8');

    if (content.length === 0) {
      return {
        ruleId: this.ruleId,
        filePath,
        success: true,
        message: 'File is empty',
        safety: this.safety,
        applied: false,
      };
    }

    let fixedContent: string;

    // Normalize EOF newline to exactly one \n
    if (!content.endsWith('\n')) {
      fixedContent = content + '\n';
    } else {
      // If it ends with multiple newlines, trim them down to exactly one \n
      let trimmed = content;
      while (trimmed.endsWith('\n\n')) {
        trimmed = trimmed.substring(0, trimmed.length - 1);
      }
      fixedContent = trimmed;
    }

    // No-op Write Protection
    if (fixedContent === content) {
      return {
        ruleId: this.ruleId,
        filePath,
        success: true,
        message: 'No-op: EOF newline already correctly formatted',
        safety: this.safety,
        applied: false,
      };
    }

    return {
      ruleId: this.ruleId,
      filePath,
      success: true,
      message: 'Normalized EOF newline',
      safety: this.safety,
      applied: true,
      originalContent: content,
      fixedContent,
    };
  }
}
