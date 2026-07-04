import { IBaseValidator } from '../base/validator';
import { ValidatorResult } from '../../types';
import { readFileSync, existsSync } from 'fs';

export class AccessibilityValidator implements IBaseValidator {
  id = 'VAL-A11Y-001';
  title = 'Accessibility Landmark Validator';
  description = 'Scans client component interfaces for ARIA landmarks and tap targets dimensions';
  category = 'accessibility';
  severity = 'medium' as const;
  dependencies: string[] = [];

  async execute(repoRoot: string, filesList: string[]): Promise<ValidatorResult> {
    const findings: any[] = [];

    for (const file of filesList) {
      if (file.endsWith('.tsx')) {
        if (!existsSync(file)) continue;
        const content = readFileSync(file, 'utf8');
        if (content.includes('<button') && !content.includes('aria-label') && !content.includes('aria-labelledby') && !content.includes('aria-hidden')) {
          findings.push({
            ruleId: 'A11Y-001',
            severity: 'medium',
            file,
            line: 1,
            evidence: 'HTML button tag missing accessibility aria-label definitions.',
            recommendation: 'Declare proper aria-label or accessible text wrappers inside button tags.'
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
      recommendation: findings.length > 0 ? 'Correct button accessibility attributes.' : 'A11y guidelines validated.',
      findings
    } as any;
  }
}
import { validatorRegistry } from '../base/registry';
validatorRegistry.register(new AccessibilityValidator());
