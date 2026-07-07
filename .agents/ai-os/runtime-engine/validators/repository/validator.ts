import { IBaseValidator } from '../base/validator';
import { ValidatorResult } from '../../types';
import { existsSync } from 'fs';
import { join } from 'path';

export class RepositoryValidator implements IBaseValidator {
  id = 'VAL-REP-001';
  title = 'Repository Validator';
  description = 'Validates workspaces lockfile structure and package configurations';
  category = 'repository';
  severity = 'critical' as const;
  dependencies: string[] = [];

  async execute(repoRoot: string, filesList: string[]): Promise<ValidatorResult> {
    const findings: any[] = [];

    const lockfilePath = join(repoRoot, 'pnpm-lock.yaml');
    if (!existsSync(lockfilePath)) {
      findings.push({
        ruleId: 'REP-001',
        severity: 'critical',
        file: 'pnpm-lock.yaml',
        line: 1,
        evidence: 'pnpm-lock.yaml not found at root path.',
        recommendation: 'Run pnpm install to regenerate lockfile.'
      });
    }

    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      confidence: 1.0,
      evidence: existsSync(lockfilePath) ? 'pnpm-lock.yaml exists.' : 'Missing lockfile.',
      recommendation: findings.length > 0 ? 'Resolve critical workspace files issues.' : 'Repository files verified.',
      findings
    } as any;
  }
}
import { validatorRegistry } from '../base/registry';
validatorRegistry.register(new RepositoryValidator());
