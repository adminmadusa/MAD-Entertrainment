import { Finding } from '../validators/base/validator';
import { fixRunner } from '../base/runner';
import { AutoFixResult } from '../base/result';

export class DryRunManager {
  async executeDryRun(repoRoot: string, findings: Finding[]): Promise<AutoFixResult[]> {
    return await fixRunner.runFixes({
      repoRoot,
      findings,
      dryRun: true
    });
  }
}
