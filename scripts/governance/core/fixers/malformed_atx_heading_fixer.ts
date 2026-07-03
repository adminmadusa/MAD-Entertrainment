import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Fixer, FixResultItem } from '../fix_types';
import { FixContext } from '../fix_context';
import { StatelessViolation } from '../types';

export class MalformedAtxHeadingFixer implements Fixer {
  readonly ruleId = 'Malformed ATX Heading';
  readonly safety = 'SAFE';

  async fix(violation: StatelessViolation, context: FixContext): Promise<FixResultItem> {
    const filePath = violation.path;
    const fullPath = resolve(context.workspaceRoot, filePath);
    const content = readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    const lineIdx = (violation.line || 1) - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) {
      return {
        ruleId: this.ruleId,
        filePath,
        success: false,
        message: `Line number ${violation.line} is out of bounds`,
        safety: this.safety,
        applied: false,
      };
    }

    const originalLine = lines[lineIdx];
    
    // Heading spacing normalization: e.g. #Heading -> # Heading
    const fixedLine = originalLine.replace(/^(#+)([^#\s])/, '$1 $2');

    if (fixedLine === originalLine) {
      return {
        ruleId: this.ruleId,
        filePath,
        success: true,
        message: 'Line already fixed',
        safety: this.safety,
        applied: false,
      };
    }

    lines[lineIdx] = fixedLine;
    const fixedContent = lines.join('\n');

    return {
      ruleId: this.ruleId,
      filePath,
      success: true,
      message: `Fixed malformed ATX heading spacing at line ${violation.line}`,
      safety: this.safety,
      applied: true,
      originalContent: content,
      fixedContent,
    };
  }
}
