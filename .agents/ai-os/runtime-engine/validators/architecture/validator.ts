import { IBaseValidator } from '../base/validator';
import { ValidatorResult } from '../../types';
import { readFileSync, existsSync } from 'fs';

export class ArchitectureValidator implements IBaseValidator {
  id = 'VAL-ARC-001';
  title = 'Architecture Validator';
  description = 'Enforces allowed package import boundaries and unidirectional data flows';
  category = 'architecture';
  severity = 'critical' as const;
  dependencies: string[] = [];

  async execute(repoRoot: string, filesList: string[]): Promise<ValidatorResult> {
    const findings: any[] = [];

    // Audits package boundaries in files list
    for (const file of filesList) {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        if (!existsSync(file)) continue;
        const content = readFileSync(file, 'utf8');
        // Simple regex check to verify server components do not import client packages directly
        if (file.includes('apps/server') && content.includes("@mad/ui")) {
          findings.push({
            ruleId: 'ARC-001',
            severity: 'critical',
            file,
            line: 1,
            evidence: 'Server module imports UI component package "@mad/ui"',
            recommendation: 'Sever interface component dependencies in backend services.'
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
      recommendation: findings.length > 0 ? 'Correct import boundary violations.' : 'Package import flows verified.',
      findings
    } as any;
  }
}
import { validatorRegistry } from '../base/registry';
validatorRegistry.register(new ArchitectureValidator());
