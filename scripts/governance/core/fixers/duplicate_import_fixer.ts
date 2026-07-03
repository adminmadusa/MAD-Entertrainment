import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as ts from 'typescript';
import { Fixer, FixResultItem } from '../fix_types';
import { FixContext } from '../fix_context';
import { StatelessViolation } from '../types';
import { ASTParserCache } from '../ast_parser_cache';

export class DuplicateImportFixer implements Fixer {
  readonly ruleId = 'VAL-HYG-002';
  readonly safety = 'SAFE';

  async fix(violation: StatelessViolation, context: FixContext): Promise<FixResultItem> {
    const filePath = violation.path;
    const fullPath = resolve(context.workspaceRoot, filePath);
    const content = readFileSync(fullPath, 'utf8');

    const sourceFile = ASTParserCache.getSourceFile(filePath);
    if (!sourceFile) {
      return {
        ruleId: this.ruleId,
        filePath,
        success: false,
        message: 'Failed to parse SourceFile AST',
        safety: this.safety,
        applied: false,
      };
    }

    const imports: ts.ImportDeclaration[] = [];
    sourceFile.forEachChild(node => {
      if (ts.isImportDeclaration(node)) {
        imports.push(node);
      }
    });

    if (imports.length <= 1) {
      return {
        ruleId: this.ruleId,
        filePath,
        success: true,
        message: 'No duplicate imports found',
        safety: this.safety,
        applied: false,
      };
    }

    // Group imports by module specifier text
    const groups = new Map<string, ts.ImportDeclaration[]>();
    for (const imp of imports) {
      if (ts.isStringLiteral(imp.moduleSpecifier)) {
        const key = imp.moduleSpecifier.text;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(imp);
      }
    }

    // We will do replacement using a list of replacements: start, end, text
    const replacements: { start: number; end: number; text: string }[] = [];
    let anyMerged = false;

    for (const [moduleSpec, group] of groups.entries()) {
      if (group.length <= 1) continue;

      // Safety Gates Checks:
      let isGroupSafe = true;
      const isTypeOnly = group[0].importClause?.isTypeOnly === true;
      const specifiersMap = new Map<string, { propertyName?: string; name: string }>();

      // Check all imports in the group
      for (const imp of group) {
        // 1. Must have import clause (no side-effect imports)
        if (!imp.importClause) {
          isGroupSafe = false;
          break;
        }

        // 2. Must have the same type-only status
        if (imp.importClause.isTypeOnly !== isTypeOnly) {
          isGroupSafe = false;
          break;
        }

        // 3. No default import (import clause name must be undefined)
        if (imp.importClause.name) {
          isGroupSafe = false;
          break;
        }

        // 4. No namespace import (* as)
        if (imp.importClause.namedBindings && ts.isNamespaceImport(imp.importClause.namedBindings)) {
          isGroupSafe = false;
          break;
        }

        // 5. Must have named bindings
        if (!imp.importClause.namedBindings || !ts.isNamedImports(imp.importClause.namedBindings)) {
          isGroupSafe = false;
          break;
        }

        // 6. No assertions/attributes clause
        if ((imp as any).assertClause || (imp as any).attributes) {
          isGroupSafe = false;
          break;
        }

        // Collect and check specifiers
        const elements = imp.importClause.namedBindings.elements;
        for (const el of elements) {
          const propName = el.propertyName?.text;
          const importName = el.name.text;
          const origName = propName || importName;

          // Check alias conflict
          if (specifiersMap.has(origName)) {
            const existing = specifiersMap.get(origName)!;
            if (existing.name !== importName) {
              isGroupSafe = false; // Alias conflict!
              break;
            }
          } else {
            specifiersMap.set(origName, { propertyName: propName, name: importName });
          }
        }

        if (!isGroupSafe) break;
      }

      if (!isGroupSafe) continue;

      // Build the merged import string
      const firstImp = group[0];
      const quoteChar = firstImp.moduleSpecifier.getText(sourceFile).charAt(0) || "'";

      const elementsText = Array.from(specifiersMap.values()).map(spec => {
        if (spec.propertyName) {
          return `${spec.propertyName} as ${spec.name}`;
        }
        return spec.name;
      }).sort().join(', ');

      const typeKeyword = isTypeOnly ? 'type ' : '';
      const hasSemicolon = firstImp.getText(sourceFile).endsWith(';');
      const mergedText = `import ${typeKeyword}{ ${elementsText} } from ${quoteChar}${moduleSpec}${quoteChar}${hasSemicolon ? ';' : ''}`;

      // Queue replacements
      // First import in group is replaced with merged text
      replacements.push({
        start: firstImp.getStart(sourceFile),
        end: firstImp.getEnd(),
        text: mergedText,
      });

      // Subsequent imports are removed
      for (let i = 1; i < group.length; i++) {
        let start = group[i].getStart(sourceFile);
        let end = group[i].getEnd();

        // Consume trailing newline to avoid leaving blank lines
        if (content.charAt(end) === '\r' && content.charAt(end + 1) === '\n') {
          end += 2;
        } else if (content.charAt(end) === '\n') {
          end += 1;
        }

        replacements.push({
          start,
          end,
          text: '',
        });
      }

      anyMerged = true;
    }

    if (!anyMerged) {
      return {
        ruleId: this.ruleId,
        filePath,
        success: true,
        message: 'No duplicate imports were safe to merge',
        safety: this.safety,
        applied: false,
      };
    }

    // Apply replacements from back to front to keep indexes stable
    replacements.sort((a, b) => b.start - a.start);
    let updatedContent = content;
    for (const rep of replacements) {
      updatedContent = updatedContent.substring(0, rep.start) + rep.text + updatedContent.substring(rep.end);
    }

    // No-op Write Protection
    if (updatedContent === content) {
      return {
        ruleId: this.ruleId,
        filePath,
        success: true,
        message: 'No-op: Content after merge is identical',
        safety: this.safety,
        applied: false,
      };
    }

    return {
      ruleId: this.ruleId,
      filePath,
      success: true,
      message: 'Merged duplicate imports safely',
      safety: this.safety,
      applied: true,
      originalContent: content,
      fixedContent: updatedContent,
    };
  }
}
