import { readFileSync } from 'fs';
import { resolve, dirname, relative, isAbsolute } from 'path';
import { Fixer, FixResultItem } from '../fix_types';
import { FixContext } from '../fix_context';
import { StatelessViolation } from '../types';
import { parseLinksFromLine } from '../markdown_utils';

export class WorkstationPathFixer implements Fixer {
  readonly ruleId = 'VAL-DOC-001';
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
    
    // Parse links from line
    const parsedLinks = parseLinksFromLine(originalLine);
    let updatedLine = originalLine;
    let anyChanges = false;
    let outsideWorkspaceFound = false;

    for (const pl of parsedLinks) {
      if (pl.urlOrRef.startsWith('file:///')) {
        // Extract absolute path
        const decodedUrl = decodeURIComponent(pl.urlOrRef.substring(7));
        const hashIdx = decodedUrl.indexOf('#');
        const cleanPath = hashIdx !== -1 ? decodedUrl.substring(0, hashIdx) : decodedUrl;
        const anchor = hashIdx !== -1 ? decodedUrl.substring(hashIdx) : '';

        const targetFullPath = resolve(cleanPath);

        // Security check: Must resolve inside the workspace root
        const rel = relative(context.workspaceRoot, targetFullPath);
        const isInsideWorkspace = !rel.startsWith('..') && !isAbsolute(rel);

        if (isInsideWorkspace) {
          // Resolve relative URL relative to containing file's directory
          let newRelUrl = relative(fileDir, targetFullPath);
          
          // Guarantee forward slashes
          newRelUrl = newRelUrl.replace(/\\/g, '/');

          if (!newRelUrl.startsWith('.')) {
            newRelUrl = './' + newRelUrl;
          }

          const fullNewUrl = newRelUrl + anchor;
          updatedLine = updatedLine.replace(pl.urlOrRef, fullNewUrl);
          anyChanges = true;
        } else {
          outsideWorkspaceFound = true;
        }
      }
    }

    if (outsideWorkspaceFound && !anyChanges) {
      return {
        ruleId: this.ruleId,
        filePath,
        success: false,
        message: 'Forbidden workstation path points outside the workspace and cannot be auto-fixed',
        safety: this.safety,
        applied: false,
      };
    }

    if (!anyChanges) {
      return {
        ruleId: this.ruleId,
        filePath,
        success: true,
        message: 'No workstation path changes required',
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
      message: `Converted local workstation paths to relative repo paths at line ${violation.line}`,
      safety: this.safety,
      applied: true,
      originalContent: content,
      fixedContent,
    };
  }
}
