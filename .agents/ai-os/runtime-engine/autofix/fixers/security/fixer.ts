import { IFixer } from '../../base/fixer';
import { FixContext } from '../../base/context';
import { AutoFixResult } from '../../base/result';

export class SecurityFixer implements IFixer {
  id = 'SEC-001';
  title = 'Security Mock Gateway Block Fixer';
  category = 'security';

  async suggestFix(context: FixContext): Promise<AutoFixResult> {
    const lines = context.originalContent.split('\n');
    const targetIdx = context.finding.line - 1;

    if (targetIdx >= 0 && targetIdx < lines.length) {
      const originalLine = lines[targetIdx];
      const modifiedLine = `if (process.env.NODE_ENV !== 'production') { ${originalLine} }`;
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
        validatorId: 'VAL-SEC-001'
      };

      return { success: true, patch, modifiedContent };
    }

    return { success: false, patch: null, modifiedContent: context.originalContent, error: 'Finding line out of bounds.' };
  }
}
import { fixerRegistry } from '../../base/registry';
fixerRegistry.register(new SecurityFixer());
