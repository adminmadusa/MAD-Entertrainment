import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Fixer, FixResultItem } from '../fix_types';
import { FixContext } from '../fix_context';
import { StatelessViolation } from '../types';

export class TrailingWhitespaceFixer implements Fixer {
  readonly ruleId = 'VAL-HYG-004';
  readonly safety = 'SAFE';

  async fix(violation: StatelessViolation, context: FixContext): Promise<FixResultItem> {
    const filePath = violation.path;
    const fullPath = resolve(context.workspaceRoot, filePath);
    const content = readFileSync(fullPath, 'utf8');

    const lines = content.split('\n');
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
      const original = lines[i];
      const trimmed = original.replace(/[ \t]+$/, '');
      if (trimmed !== original) {
        lines[i] = trimmed;
        modified = true;
      }
    }

    if (!modified) {
      return {
        ruleId: this.ruleId,
        filePath,
        success: true,
        message: 'No trailing whitespace detected',
        safety: this.safety,
        applied: false,
      };
    }

    const fixedContent = lines.join('\n');

    // No-op Write Protection
    if (fixedContent === content) {
      return {
        ruleId: this.ruleId,
        filePath,
        success: true,
        message: 'No-op: Content after fix matches original content',
        safety: this.safety,
        applied: false,
      };
    }

    return {
      ruleId: this.ruleId,
      filePath,
      success: true,
      message: 'Trimmed trailing whitespace',
      safety: this.safety,
      applied: true,
      originalContent: content,
      fixedContent,
    };
  }
}
