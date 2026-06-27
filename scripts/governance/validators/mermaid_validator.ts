// scripts/governance/validators/mermaid_validator.ts

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { GovernanceValidator } from '../core/validator';
import { ValidationResult, ValidationError } from '../core/types';

const workspaceRoot = resolve(__dirname, '../../..');

const VALID_DIAGRAM_TYPES = [
  'graph',
  'flowchart',
  'sequencediagram',
  'classdiagram',
  'statediagram-v2',
  'statediagram',
  'erdiagram',
  'gantt',
  'pie',
  'gitgraph',
  'journey',
  'requirementdiagram',
];

export class MermaidValidator implements GovernanceValidator {
  readonly name = 'MermaidValidator';

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

      let inMermaidBlock = false;
      let mermaidBlockLines: { lineNum: number; content: string }[] = [];

      for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const lineNum = index + 1;

        if (line.trim().startsWith('```mermaid')) {
          inMermaidBlock = true;
          mermaidBlockLines = [];
          continue;
        }

        if (inMermaidBlock && line.trim().startsWith('```')) {
          inMermaidBlock = false;
          this.validateMermaidBlock(relPath, mermaidBlockLines, errors);
          continue;
        }

        if (inMermaidBlock) {
          mermaidBlockLines.push({ lineNum, content: line });
        }
      }

      if (inMermaidBlock) {
        errors.push({
          file: relPath,
          rule: 'Unclosed Mermaid Block',
          severity: 'ERROR',
          message: 'Found an unclosed ```mermaid block at the end of the document.',
        });
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

  private validateMermaidBlock(file: string, block: { lineNum: number; content: string }[], errors: ValidationError[]) {
    // Filter out comments and empty lines
    const contentLines = block
      .map(b => ({ ...b, clean: b.content.trim() }))
      .filter(b => b.clean.length > 0 && !b.clean.startsWith('%%'));

    if (contentLines.length === 0) {
      errors.push({
        file,
        line: block[0]?.lineNum,
        rule: 'Empty Mermaid Block',
        severity: 'ERROR',
        message: 'The Mermaid diagram block is empty.',
      });
      return;
    }

    // 1. Validate diagram type
    const firstLine = contentLines[0].clean.toLowerCase();
    const diagramType = VALID_DIAGRAM_TYPES.find(type => firstLine.startsWith(type));

    if (!diagramType) {
      errors.push({
        file,
        line: contentLines[0].lineNum,
        rule: 'Invalid Mermaid Diagram Type',
        severity: 'ERROR',
        snippet: contentLines[0].content.trim(),
        message: `Mermaid diagram starts with an invalid or unsupported type. Expected one of: ${VALID_DIAGRAM_TYPES.join(', ')}`,
      });
      return;
    }

    const isFlowchartOrGraph = diagramType === 'graph' || diagramType === 'flowchart';

    // 2. Validate line-by-line syntax
    for (const lineObj of contentLines) {
      const line = lineObj.clean;
      const lineNum = lineObj.lineNum;

      // Skip lines defining diagram headers (like graph TD) unless they also contain shapes/connections
      if (line.toLowerCase() === diagramType || line.toLowerCase().startsWith(`${diagramType} `)) {
        if (!line.includes('[') && !line.includes('(') && !line.includes('{') && !line.includes('-')) {
          continue;
        }
      }

      // Check balanced double quotes (unescaped)
      const quoteCount = (line.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        errors.push({
          file,
          line: lineNum,
          rule: 'Malformed Mermaid Quotes',
          severity: 'ERROR',
          snippet: lineObj.content.trim(),
          message: 'Line contains unclosed double quotes.',
        });
        continue;
      }

      // Strip double-quoted strings to avoid checking brackets inside quotes
      const strippedLine = line.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '');

      // Check brackets and parentheses balances
      const balances = [
        { open: '[', close: ']', name: 'square brackets' },
        { open: '(', close: ')', name: 'parentheses' },
        { open: '{', close: '}', name: 'braces' },
      ];

      for (const b of balances) {
        const openCount = (strippedLine.match(new RegExp(`\\${b.open}`, 'g')) || []).length;
        const closeCount = (strippedLine.match(new RegExp(`\\${b.close}`, 'g')) || []).length;
        if (openCount !== closeCount) {
          errors.push({
            file,
            line: lineNum,
            rule: 'Malformed Mermaid Enclosure',
            severity: 'ERROR',
            snippet: lineObj.content.trim(),
            message: `Line contains unbalanced ${b.name} (${b.open} vs ${b.close}).`,
          });
        }
      }

      // 3. Flowchart connection check: prevent invalid "->"
      if (isFlowchartOrGraph) {
        // Detect "->" not preceded by "-" or "." and not followed by ">" or "-"
        // Regex: /(?<![-.])->(?![->])/
        if (/(?<![-.])->(?![->])/.test(strippedLine)) {
          errors.push({
            file,
            line: lineNum,
            rule: 'Invalid Mermaid Flowchart Connection',
            severity: 'ERROR',
            snippet: lineObj.content.trim(),
            message: 'Invalid arrow connector "->" detected. In flowchart/graph diagrams, use "-->" instead.',
          });
        }
      }
    }
  }
}
