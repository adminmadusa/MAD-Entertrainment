import { IFixer } from '../../base/fixer';
import { FixContext } from '../../base/context';
import { AutoFixResult } from '../../base/result';

export class NodeFixer implements IFixer {
  id = 'NOD-001';
  title = 'Node Express Async Errors Fixer';
  category = 'node';

  async suggestFix(context: FixContext): Promise<AutoFixResult> {
    const lines = context.originalContent.split('\n');
    const targetIdx = context.finding.line - 1;

    if (targetIdx >= 0 && targetIdx < lines.length) {
      const originalLine = lines[targetIdx];
      // Adds import statement at top of the file
      const modifiedContent = `import 'express-async-errors';\n${context.originalContent}`;
      const patch = {
        id: `pat_${Math.random().toString(36).substring(2, 11)}`,
        file: context.finding.file,
        original: originalLine,
        replacement: `import 'express-async-errors';\n${originalLine}`,
        lineStart: 1,
        lineEnd: 1,
        confidence: 0.95,
        validatorId: 'VAL-NOD-001'
      };

      return { success: true, patch, modifiedContent };
    }

    return { success: false, patch: null, modifiedContent: context.originalContent, error: 'Finding line out of bounds.' };
  }
}
import { fixerRegistry } from '../../base/registry';
fixerRegistry.register(new NodeFixer());
