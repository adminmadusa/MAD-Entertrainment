import { Finding } from '../validators/base/validator';
import { fixerRegistry } from './registry';
import { AutoFixResult } from './result';
import { existsSync, readFileSync, writeFileSync } from 'fs';

export interface FixRunnerOptions {
  repoRoot: string;
  findings: Finding[];
  dryRun: boolean;
}

export class FixRunner {
  async runFixes(options: FixRunnerOptions): Promise<AutoFixResult[]> {
    const results: AutoFixResult[] = [];

    for (const finding of options.findings) {
      const fixer = fixerRegistry.get(finding.ruleId);
      if (!fixer) continue;

      if (!existsSync(finding.file)) continue;
      const originalContent = readFileSync(finding.file, 'utf8');

      const fixContext = {
        repoRoot: options.repoRoot,
        finding,
        originalContent,
        dryRun: options.dryRun
      };

      const res = await fixer.suggestFix(fixContext);
      if (res.success && !options.dryRun && res.patch) {
        writeFileSync(finding.file, res.modifiedContent, 'utf8');
      }

      results.push(res);
    }

    return results;
  }
}
export const fixRunner = new FixRunner();
