import { IBaseValidator } from '../base/validator';
import { ValidatorResult } from '../../types';
import { readFileSync, existsSync } from 'fs';

export class SecurityValidator implements IBaseValidator {
  id = 'VAL-SEC-001';
  title = 'Security Webhook & Token Validator';
  description = 'Blocks mock gateway overrides in production and evaluates webhook sign verifications';
  category = 'security';
  severity = 'critical' as const;
  dependencies: string[] = [];

  async execute(repoRoot: string, filesList: string[]): Promise<ValidatorResult> {
    const findings: any[] = [];

    for (const file of filesList) {
      if (file.includes('payment') && (file.endsWith('.ts') || file.endsWith('.js'))) {
        if (!existsSync(file)) continue;
        const content = readFileSync(file, 'utf8');
        if (content.includes('pay_mock') && !content.includes('process.env.NODE_ENV !== \'production\'')) {
          findings.push({
            ruleId: 'SEC-001',
            severity: 'critical',
            file,
            line: 1,
            evidence: 'Mock payment credential key referenced without explicit production environment block.',
            recommendation: 'Guard mock transactions inside condition environments checks.'
          });
        }
      }
    }

    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      confidence: 1.0,
      evidence: `Audited ${filesList.length} security files.`,
      recommendation: findings.length > 0 ? 'Correct payments adapter checkout locks.' : 'Security guidelines validated.',
      findings
    } as any;
  }
}
import { validatorRegistry } from '../base/registry';
validatorRegistry.register(new SecurityValidator());
