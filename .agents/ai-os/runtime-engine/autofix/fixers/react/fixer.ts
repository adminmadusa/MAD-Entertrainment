import { IFixer } from '../../base/fixer';
import { FixContext } from '../../base/context';
import { AutoFixResult } from '../../base/result';

export class ReactFixer implements IFixer {
  id = 'REC-001';
  title = 'React Hydration Safety Fixer';
  category = 'react';

  async suggestFix(context: FixContext): Promise<AutoFixResult> {
    const lines = context.originalContent.split('\n');
    const targetIdx = context.finding.line - 1;

    if (targetIdx >= 0 && targetIdx < lines.length) {
      const originalLine = lines[targetIdx];
      const modifiedLine = originalLine.replace(/window\./g, 'typeof window !== \'undefined\' && window.');
      lines[targetIdx] = modifiedLine;

      const modifiedContent = lines.join('\n');
      const patch = {
        id: `pat_${Math.random().toString(36).substring(2, 11)}`,
        file: context.finding.file,
        original: originalLine,
        replacement: modifiedLine,
        lineStart: context.finding.line,
        lineEnd: context.finding.line,
        confidence: 0.85,
        validatorId: 'VAL-REC-001'
      };

      return { success: true, patch, modifiedContent };
    }

    return { success: false, patch: null, modifiedContent: context.originalContent, error: 'Finding line out of bounds.' };
  }
}
import { fixerRegistry } from '../../base/registry';
fixerRegistry.register(new ReactFixer());
