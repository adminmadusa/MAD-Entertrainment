import { readFileSync } from 'fs';
import { resolve, dirname, relative } from 'path';
import { Fixer, FixResultItem } from '../fix_types';
import { FixContext } from '../fix_context';
import { StatelessViolation } from '../types';
import { parseLinksFromLine, checkPathCasing, resolveRelativePath } from '../markdown_utils';

export class FilenameCasingFixer implements Fixer {
  readonly ruleId = 'VAL-DOC-004';
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
    const fileDir = dirname(fullPath);
    const parsedLinks = parseLinksFromLine(originalLine);

    let updatedLine = originalLine;
    let anyChanges = false;

    for (const pl of parsedLinks) {
      if (pl.type === 'inline' && !pl.urlOrRef.startsWith('http://') && !pl.urlOrRef.startsWith('https://')) {
        const hashIdx = pl.urlOrRef.indexOf('#');
        const cleanUrl = hashIdx !== -1 ? pl.urlOrRef.substring(0, hashIdx) : pl.urlOrRef;
        const anchor = hashIdx !== -1 ? pl.urlOrRef.substring(hashIdx) : '';

        const cleanRelPath = resolveRelativePath(cleanUrl, fileDir);
        const casingStatus = checkPathCasing(context.workspaceRoot, cleanRelPath);

        if (casingStatus.status === 'CASE_MISMATCH' && casingStatus.canonicalPath) {
          // Re-casing needed!
          // Compute new relative URL relative to containing file's directory
          const targetFullPath = resolve(context.workspaceRoot, casingStatus.canonicalPath);
          let newRelUrl = relative(fileDir, targetFullPath);

          // Guarantee forward slashes
          newRelUrl = newRelUrl.replace(/\\/g, '/');

          if (!newRelUrl.startsWith('.')) {
            newRelUrl = './' + newRelUrl;
          }

          const fullNewUrl = newRelUrl + anchor;

          // Replace link target casing segment
          updatedLine = updatedLine.replace(pl.urlOrRef, fullNewUrl);
          anyChanges = true;
        }
      }
    }

    if (!anyChanges) {
      return {
        ruleId: this.ruleId,
        filePath,
        success: true,
        message: 'No link target casing changes required',
        safety: this.safety,
        applied: false,
      };
    }

    lines[lineIdx] = updatedLine;
    const fixedContent = lines.join('\n');

    return {
      ruleId: this.ruleId,
      filePath,
      success: true,
      message: `Fixed filename casing mismatch at line ${violation.line}`,
      safety: this.safety,
      applied: true,
      originalContent: content,
      fixedContent,
    };
  }
}
