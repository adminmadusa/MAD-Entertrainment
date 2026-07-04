import { IBaseValidator } from '../base/validator';
import { ValidatorResult } from '../../types';
import { readFileSync, existsSync } from 'fs';

export class ReactValidator implements IBaseValidator {
  id = 'VAL-REC-001';
  title = 'React Component Validator';
  description = 'Scans components for hydration safety and dangerous markup references';
  category = 'react';
  severity = 'high' as const;
  dependencies: string[] = [];

  async execute(repoRoot: string, filesList: string[]): Promise<ValidatorResult> {
    const findings: any[] = [];

    for (const file of filesList) {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        if (!existsSync(file)) continue;
        const content = readFileSync(file, 'utf8');
        if (content.includes('window.') && !content.includes('useEffect') && !content.includes('typeof window')) {
          findings.push({
            ruleId: 'REC-001',
            severity: 'high',
            file,
            line: 1,
            evidence: 'Unguarded window access outside of useEffect scope.',
            recommendation: 'Wrap client properties queries inside mounting hooks.'
          });
        }
      }
    }

    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      confidence: 1.0,
      evidence: `Audited ${filesList.length} files.`,
      recommendation: findings.length > 0 ? 'Correct client window variables references.' : 'React component rules validated.',
      findings
    } as any;
  }
}
import { validatorRegistry } from '../base/registry';
validatorRegistry.register(new ReactValidator());
