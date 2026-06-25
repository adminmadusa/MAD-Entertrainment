// scripts/governance/validators/markdown_validator.ts

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';

const workspaceRoot = resolve(__dirname, '../../..');

export class MarkdownValidator implements GovernanceValidator {
  readonly name = 'MarkdownValidator';

  public async run(files: string[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const startTime = Date.now();
    let filesProcessed = 0;

    for (const relPath of files) {
      const fullPath = resolve(workspaceRoot, relPath);
      if (!existsSync(fullPath)) {
        continue;
      }

      filesProcessed++;
      const content = readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      let inCodeBlock = false;
      const headingPathsSet = new Set<string>();
      const currentHierarchy: string[] = [];
      let currentTable: { lineNum: number; content: string }[] = [];

      for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const lineNum = index + 1;

        // Code block toggle
        if (line.trim().startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          continue;
        }

        if (inCodeBlock) {
          continue;
        }

        // 1. Validate ATX headings
        if (line.startsWith('#')) {
          const match = /^(#+)(.*)/.exec(line);
          if (match) {
            const hashes = match[1];
            const headingText = match[2];
            const level = hashes.length;

            // If it starts with # but doesn't have a space immediately after the hashes
            // e.g. #Heading, but allow trailing hashes in ATX headings (e.g. # Heading #)
            if (headingText && !headingText.startsWith(' ') && !headingText.startsWith('\t') && !headingText.startsWith('#')) {
              errors.push({
                file: relPath,
                line: lineNum,
                rule: 'Malformed ATX Heading',
                severity: 'ERROR',
                snippet: line.trim(),
                message: 'ATX headings must have a space after the "#" character sequence (e.g. "# Heading").',
              });
            }

            const cleanText = headingText.replace(/#+$/, '').trim();
            
            // Update hierarchy
            currentHierarchy[level - 1] = cleanText;
            currentHierarchy.length = level; // Truncate to current level depth
            
            const headingPath = currentHierarchy.join(' > ');

            if (headingPathsSet.has(headingPath)) {
              errors.push({
                file: relPath,
                line: lineNum,
                rule: 'Duplicate Heading',
                severity: 'ERROR',
                snippet: line.trim(),
                message: `Duplicate heading path "${headingPath}" found in the same file.`,
              });
            } else {
              headingPathsSet.add(headingPath);
            }
          }
        }

        // 2. Collect and validate markdown tables
        if (line.includes('|')) {
          currentTable.push({ lineNum, content: line });
        } else {
          if (currentTable.length > 0) {
            this.validateTable(relPath, currentTable, errors);
            currentTable = [];
          }
        }
      }

      // Check for unclosed code block
      if (inCodeBlock) {
        errors.push({
          file: relPath,
          rule: 'Unclosed Fenced Code Block',
          severity: 'ERROR',
          message: 'The file contains an unclosed fenced code block at the end of the document.',
        });
      }

      // Check if file ends with an open table
      if (currentTable.length > 0) {
        this.validateTable(relPath, currentTable, errors);
      }
    }

    return {
      name: this.name,
      success: errors.filter(e => e.severity === 'ERROR').length === 0,
      errors,
      warnings,
      statistics: { filesProcessed },
      executionTimeMs: Date.now() - startTime,
    };
  }

  private validateTable(file: string, table: { lineNum: number; content: string }[], errors: ValidationError[]) {
    if (table.length < 2) {
      return; // Not a valid table block
    }

    // Check if the second row is a separator row: e.g. |:---|:---|
    const secondRow = table[1].content.trim();
    const isSeparator = /^\|[\s|:\-]+$/.test(secondRow);
    if (!isSeparator) {
      return; // Probably not a table, just paragraphs with | characters
    }

    // Function to count unescaped pipes
    const countPipes = (str: string): number => {
      let count = 0;
      for (let i = 0; i < str.length; i++) {
        if (str[i] === '|' && (i === 0 || str[i - 1] !== '\\')) {
          count++;
        }
      }
      return count;
    };

    const headerPipeCount = countPipes(table[0].content);
    for (let i = 1; i < table.length; i++) {
      const pipeCount = countPipes(table[i].content);
      if (pipeCount !== headerPipeCount) {
        errors.push({
          file,
          line: table[i].lineNum,
          rule: 'Malformed Table Column Count',
          severity: 'ERROR',
          snippet: table[i].content.trim(),
          message: `Table row has a mismatching number of columns (expected ${headerPipeCount - 1} columns, found ${pipeCount - 1}).`,
        });
      }
    }
  }
}
