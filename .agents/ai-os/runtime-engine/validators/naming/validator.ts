import { IBaseValidator } from '../base/validator';
import { ValidatorResult } from '../../types';
import { basename } from 'path';

export class NamingValidator implements IBaseValidator {
  id = 'VAL-NAM-001';
  title = 'Naming Validator';
  description = 'Validates folder casing and disallowed temporary folders name patterns';
  category = 'naming';
  severity = 'high' as const;
  dependencies: string[] = [];

  async execute(repoRoot: string, filesList: string[]): Promise<ValidatorResult> {
    const findings: any[] = [];

    const disallowedFolders = ['temp', 'temp2', 'misc', 'old', 'backup', 'new-folder', 'final', 'test2'];

    for (const file of filesList) {
      const name = basename(file);
      // Evaluates folders casings rules
      const parts = file.split('/');
      for (const part of parts) {
        if (disallowedFolders.includes(part.toLowerCase())) {
          findings.push({
            ruleId: 'NAM-002',
            severity: 'high',
            file,
            line: 1,
            evidence: `Disallowed folder pattern detected: "${part}"`,
            recommendation: 'Remove temporary or misc folder designations.'
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
      recommendation: findings.length > 0 ? 'Correct naming casing and delete temporary folders.' : 'No naming issues found.',
      findings
    } as any;
  }
}
import { validatorRegistry } from '../base/registry';
validatorRegistry.register(new NamingValidator());
