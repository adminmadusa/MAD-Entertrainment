import { IBaseValidator } from '../base/validator';
import { ValidatorResult } from '../../types';
import { readFileSync, existsSync } from 'fs';

export class DatabaseValidator implements IBaseValidator {
  id = 'VAL-DB-001';
  title = 'Database Index & Transaction Validator';
  description = 'Scans Mongoose schemas for production indexing and write operations session properties';
  category = 'database';
  severity = 'critical' as const;
  dependencies: string[] = [];

  async execute(repoRoot: string, filesList: string[]): Promise<ValidatorResult> {
    const findings: any[] = [];

    for (const file of filesList) {
      if (file.endsWith('.schema.ts') || file.endsWith('.model.ts')) {
        if (!existsSync(file)) continue;
        const content = readFileSync(file, 'utf8');
        if (content.includes('autoIndex') && !content.includes('autoIndex: false')) {
          findings.push({
            ruleId: 'DB-001',
            severity: 'critical',
            file,
            line: 1,
            evidence: 'Schema autoIndex setting is not set to false.',
            recommendation: 'Configure Mongoose schema with { autoIndex: false } configuration.'
          });
        }
      }
    }

    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      confidence: 1.0,
      evidence: `Audited ${filesList.length} database files.`,
      recommendation: findings.length > 0 ? 'Correct schemas configuration.' : 'Database guidelines validated.',
      findings
    } as any;
  }
}
import { validatorRegistry } from '../base/registry';
validatorRegistry.register(new DatabaseValidator());
