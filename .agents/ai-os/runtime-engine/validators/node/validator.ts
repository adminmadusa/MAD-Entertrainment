import { IBaseValidator } from '../base/validator';
import { ValidatorResult } from '../../types';
import { readFileSync, existsSync } from 'fs';

export class NodeValidator implements IBaseValidator {
  id = 'VAL-NOD-001';
  title = 'Node Express Validator';
  description = 'Scans Express controllers and async routing error handlers';
  category = 'node';
  severity = 'high' as const;
  dependencies: string[] = [];

  async execute(repoRoot: string, filesList: string[]): Promise<ValidatorResult> {
    const findings: any[] = [];

    for (const file of filesList) {
      if (file.includes('controller') && (file.endsWith('.ts') || file.endsWith('.js'))) {
        if (!existsSync(file)) continue;
        const content = readFileSync(file, 'utf8');
        if (content.includes('async ') && !content.includes('catch') && !content.includes('express-async-errors')) {
          findings.push({
            ruleId: 'NOD-001',
            severity: 'high',
            file,
            line: 1,
            evidence: 'Async controller routing logic missing promise catch boundaries.',
            recommendation: 'Wrap routing statements in try-catch logic or import express-async-errors.'
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
      recommendation: findings.length > 0 ? 'Wrap async controllers in error handlers.' : 'Node Express routing rules validated.',
      findings
    } as any;
  }
}
import { validatorRegistry } from '../base/registry';
validatorRegistry.register(new NodeValidator());
