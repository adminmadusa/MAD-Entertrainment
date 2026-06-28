import { IBaseValidator } from '../base/validator';
import { ValidatorResult } from '../../types';
import { readFileSync, existsSync } from 'fs';

export class DocumentationValidator implements IBaseValidator {
  id = 'VAL-DOC-001';
  title = 'Documentation Link Validator';
  description = 'Scans markdown documents to enforce absolute file scheme links';
  category = 'documentation';
  severity = 'medium' as const;
  dependencies: string[] = [];

  async execute(repoRoot: string, filesList: string[]): Promise<ValidatorResult> {
    const findings: any[] = [];

    for (const file of filesList) {
      if (file.endsWith('.md')) {
        if (!existsSync(file)) continue;
        const content = readFileSync(file, 'utf8');
        // Simple regex to match markdown link patterns: [text](path)
        const linkMatches = content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g);
        for (const match of linkMatches) {
          const path = match[1];
          if (path.includes('/') && !path.startsWith('file://') && !path.startsWith('http://') && !path.startsWith('https://') && !path.startsWith('#')) {
            findings.push({
              ruleId: 'DOC-001',
              severity: 'medium',
              file,
              line: 1,
              evidence: `Relative markdown link destination detected: "${path}"`,
              recommendation: 'Declare destination using absolute "file:///Users/admin/..." scheme.'
            });
          }
        }
      }
    }

    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      confidence: 1.0,
      evidence: `Audited ${filesList.length} documentation files.`,
      recommendation: findings.length > 0 ? 'Correct relative markdown links.' : 'Documentation absolute links validated.',
      findings
    } as any;
  }
}
import { validatorRegistry } from '../base/registry';
validatorRegistry.register(new DocumentationValidator());
