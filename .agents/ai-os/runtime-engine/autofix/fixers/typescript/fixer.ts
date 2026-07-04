import { IFixer } from '../../base/fixer';
import { FixContext } from '../../base/context';
import { AutoFixResult } from '../../base/result';

export class TypeScriptFixer implements IFixer {
  id = 'TS-001';
  title = 'TypeScript Type Annotations Fixer';
  category = 'typescript';

  async suggestFix(context: FixContext): Promise<AutoFixResult> {
    const lines = context.originalContent.split('\n');
    const targetIdx = context.finding.line - 1;

    if (targetIdx >= 0 && targetIdx < lines.length) {
      const originalLine = lines[targetIdx];
      // Replaces explicit any annotation with unknown
      const modifiedLine = originalLine.replace(/:\s*any/g, ': unknown');
      lines[targetIdx] = modifiedLine;

      const modifiedContent = lines.join('\n');
      const patch = {
        id: `pat_${Math.random().toString(36).substring(2, 11)}`,
        file: context.finding.file,
        original: originalLine,
        replacement: modifiedLine,
        lineStart: context.finding.line,
        lineEnd: context.finding.line,
        confidence: 0.9,
        validatorId: 'VAL-TS-001'
      };

      return { success: true, patch, modifiedContent };
    }

    return { success: false, patch: null, modifiedContent: context.originalContent, error: 'Finding line out of bounds.' };
  }
}
import { fixerRegistry } from '../../base/registry';
fixerRegistry.register(new TypeScriptFixer());
