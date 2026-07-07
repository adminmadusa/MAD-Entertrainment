import { IBaseValidator } from '../base/validator';
import { ValidatorResult } from '../../types';
import { readFileSync, existsSync } from 'fs';

export class NextjsValidator implements IBaseValidator {
  id = 'VAL-NXT-001';
  title = 'NextJS App Router Validator';
  description = 'Scans layouts error boundaries for soft routing links';
  category = 'nextjs';
  severity = 'high' as const;
  dependencies: string[] = [];

  async execute(repoRoot: string, filesList: string[]): Promise<ValidatorResult> {
    const findings: any[] = [];

    for (const file of filesList) {
      if (file.includes('layout') || file.includes('error')) {
        if (!existsSync(file)) continue;
        const content = readFileSync(file, 'utf8');
        if (content.includes('import Link') && content.includes('ErrorBoundary')) {
          findings.push({
            ruleId: 'NXT-001',
            severity: 'high',
            file,
            line: 1,
            evidence: 'NextJS client Link used in ErrorBoundary context.',
            recommendation: 'Replace with native anchor elements to trigger full window refresh.'
          });
        }
      }
    }

    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      confidence: 1.0,
      evidence: `Audited ${filesList.length} NextJS files.`,
      recommendation: findings.length > 0 ? 'Correct layouts routing links.' : 'NextJS app router rules validated.',
      findings
    } as any;
  }
}
import { validatorRegistry } from '../base/registry';
validatorRegistry.register(new NextjsValidator());
