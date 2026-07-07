import { Finding } from '../validators/base/validator';
import { fixRunner } from '../autofix/base/runner';
import { AutoFixResult } from '../autofix/base/result';

export class AutofixController {
  async processAutofixes(
    repoRoot: string,
    findings: Finding[],
    safeOnly = true
  ): Promise<AutoFixResult[]> {
    // Critical findings are treated as unsafe to auto-fix, recommending manual changes
    const targetFindings = safeOnly
      ? findings.filter(f => f.severity !== 'critical')
      : findings;

    return await fixRunner.runFixes({
      repoRoot,
      findings: targetFindings,
      dryRun: false
    });
  }
}
export const autofixController = new AutofixController();
