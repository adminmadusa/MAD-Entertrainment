import { IFixer } from '../../base/fixer';
import { FixContext } from '../../base/context';
import { AutoFixResult } from '../../base/result';

export class DocumentationFixer implements IFixer {
  id = 'DOC-001';
  title = 'Documentation Markdown Link Fixer';
  category = 'documentation';

  async suggestFix(context: FixContext): Promise<AutoFixResult> {
    const lines = context.originalContent.split('\n');
    const targetIdx = context.finding.line - 1;

    if (targetIdx >= 0 && targetIdx < lines.length) {
      const originalLine = lines[targetIdx];
      // Extracts destination from relative destination path string and prefix absolute scheme
      const modifiedLine = originalLine.replace(/\((?!file:\/\/|https?:\/\/|#)([^)]+)\)/g, '(file:///Users/admin/Desktop/MAD%20Entertrainment/$1)');
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
        validatorId: 'VAL-DOC-001'
      };

      return { success: true, patch, modifiedContent };
    }

    return { success: false, patch: null, modifiedContent: context.originalContent, error: 'Finding line out of bounds.' };
  }
}
import { fixerRegistry } from '../../base/registry';
fixerRegistry.register(new DocumentationFixer());
