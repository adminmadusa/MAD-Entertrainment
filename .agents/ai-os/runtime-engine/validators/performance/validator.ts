import { IBaseValidator } from '../base/validator';
import { ValidatorResult } from '../../types';
import { readFileSync, existsSync } from 'fs';

export class PerformanceValidator implements IBaseValidator {
  id = 'VAL-PRF-001';
  title = 'Performance & Randomness Validator';
  description = 'Scans files for insecure Math.random references in security token generation contexts';
  category = 'performance';
  severity = 'high' as const;
  dependencies: string[] = [];

  async execute(repoRoot: string, filesList: string[]): Promise<ValidatorResult> {
    const findings: any[] = [];

    for (const file of filesList) {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        if (!existsSync(file)) continue;
        const content = readFileSync(file, 'utf8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('Math.random()') && (file.includes('auth') || file.includes('token') || file.includes('hash') || file.includes('session'))) {
            findings.push({
              ruleId: 'PRF-001',
              severity: 'high',
              file,
              line: i + 1,
              evidence: `Math.random used in cryptographic/identifier context: "${lines[i].trim()}"`,
              recommendation: 'Replace with crypto.randomBytes() or uuid generators.'
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
      evidence: `Audited ${filesList.length} files.`,
      recommendation: findings.length > 0 ? 'Correct insecure Math.random generators references.' : 'Performance guidelines validated.',
      findings
    } as any;
  }
}
import { validatorRegistry } from '../base/registry';
validatorRegistry.register(new PerformanceValidator());
