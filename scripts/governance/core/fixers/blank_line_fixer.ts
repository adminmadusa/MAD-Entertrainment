import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as ts from 'typescript';
import { Fixer, FixResultItem } from '../fix_types';
import { FixContext } from '../fix_context';
import { StatelessViolation } from '../types';
import { ASTParserCache } from '../ast_parser_cache';

export class BlankLineFixer implements Fixer {
  readonly ruleId = 'VAL-HYG-006';
  readonly safety = 'SAFE';

  async fix(violation: StatelessViolation, context: FixContext): Promise<FixResultItem> {
    const filePath = violation.path;
    const fullPath = resolve(context.workspaceRoot, filePath);
    const content = readFileSync(fullPath, 'utf8');

    const lines = content.split('\n');
    const skippedSpans: { start: number; end: number }[] = [];

    // Parse AST for JS/TS to find spans we must NOT touch (template strings, multiline comments)
    if (
      filePath.endsWith('.ts') ||
      filePath.endsWith('.tsx') ||
      filePath.endsWith('.js') ||
      filePath.endsWith('.jsx')
    ) {
      const sourceFile = ASTParserCache.getSourceFile(filePath);
      if (sourceFile) {
        const visit = (node: ts.Node) => {
          if (
            ts.isTemplateExpression(node) ||
            ts.isNoSubstitutionTemplateLiteral(node) ||
            (ts.isStringLiteral(node) && node.text.includes('\n'))
          ) {
            skippedSpans.push({ start: node.getStart(sourceFile), end: node.getEnd() });
          }
          ts.forEachChild(node, visit);
        };
        visit(sourceFile);

        const text = sourceFile.text;
        const scanComments = (node: ts.Node) => {
          const start = node.getFullStart();
          const ranges = ts.getLeadingCommentRanges(text, start) || [];
          const trailing = ts.getTrailingCommentRanges(text, node.getEnd()) || [];
          
          for (const r of [...ranges, ...trailing]) {
            if (r.kind === ts.SyntaxKind.MultiLineCommentTrivia) {
              skippedSpans.push({ start: r.pos, end: r.end });
            }
          }
          ts.forEachChild(node, scanComments);
        };
        scanComments(sourceFile);
      }
    }

    // Parse Markdown code blocks to find skipped spans
    if (filePath.endsWith('.md')) {
      let inCodeBlock = false;
      let startIdx = 0;
      let charIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('```')) {
          if (!inCodeBlock) {
            inCodeBlock = true;
            startIdx = charIdx;
          } else {
            inCodeBlock = false;
            skippedSpans.push({ start: startIdx, end: charIdx + line.length });
          }
        }
        charIdx += line.length + 1; // plus newline
      }
    }

    const isPositionSkipped = (pos: number): boolean => {
      return skippedSpans.some(span => pos >= span.start && pos < span.end);
    };

    // Group blank line runs
    const newLines: string[] = [];
    let i = 0;
    let charPos = 0;
    let modified = false;

    while (i < lines.length) {
      const line = lines[i];
      const isBlank = line.trim() === '';

      if (isBlank && !isPositionSkipped(charPos)) {
        // Start of a blank line run
        let runStart = i;
        let runEnd = i;
        let runCharPos = charPos;
        
        while (
          runEnd < lines.length &&
          lines[runEnd].trim() === '' &&
          !isPositionSkipped(runCharPos)
        ) {
          runCharPos += lines[runEnd].length + 1;
          runEnd++;
        }

        const runLength = runEnd - runStart;
        if (runLength >= 3) {
          // Collapse to exactly one blank line
          newLines.push('');
          modified = true;
        } else {
          // Keep as is
          for (let k = runStart; k < runEnd; k++) {
            newLines.push(lines[k]);
          }
        }

        // Fast forward charPos and index
        charPos = runCharPos;
        i = runEnd;
      } else {
        newLines.push(line);
        charPos += line.length + 1;
        i++;
      }
    }

    if (!modified) {
      return {
        ruleId: this.ruleId,
        filePath,
        success: true,
        message: 'No excessive blank lines detected outside template literals/code blocks',
        safety: this.safety,
        applied: false,
      };
    }

    const fixedContent = newLines.join('\n');

    // No-op Write Protection
    if (fixedContent === content) {
      return {
        ruleId: this.ruleId,
        filePath,
        success: true,
        message: 'No-op: Content after blank line collapse is identical',
        safety: this.safety,
        applied: false,
      };
    }

    return {
      ruleId: this.ruleId,
      filePath,
      success: true,
      message: 'Collapsed excessive blank lines',
      safety: this.safety,
      applied: true,
      originalContent: content,
      fixedContent,
    };
  }
}
