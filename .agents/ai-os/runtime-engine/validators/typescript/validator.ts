import { IBaseValidator } from '../base/validator';
import { ValidatorResult } from '../../types';
import { readFileSync, existsSync } from 'fs';

export class TypeScriptValidator implements IBaseValidator {
  id = 'VAL-TS-001';
  title = 'TypeScript Validator';
  description = 'Checks for strong typing enforcement and explicit any parameters';
  category = 'typescript';
  severity = 'high' as const;
  dependencies: string[] = [];

  async execute(repoRoot: string, filesList: string[]): Promise<ValidatorResult> {
    const findings: any[] = [];

    for (const file of filesList) {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        if (!existsSync(file)) continue;
        const content = readFileSync(file, 'utf8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(': any') && !lines[i].includes('// eslint-disable-next-line')) {
            findings.push({
              ruleId: 'TS-001',
              severity: 'high',
              file,
              line: i + 1,
              evidence: `Explicit any parameter: "${lines[i].trim()}"`,
              recommendation: 'Declare concrete types or interface models.'
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
      evidence: `Audited ${filesList.length} source files.`,
      recommendation: findings.length > 0 ? 'Convert explicit any parameters to concrete schemas.' : 'TS typing rules verified.',
      findings
    } as any;
  }
}
import { validatorRegistry } from '../base/registry';
validatorRegistry.register(new TypeScriptValidator());
