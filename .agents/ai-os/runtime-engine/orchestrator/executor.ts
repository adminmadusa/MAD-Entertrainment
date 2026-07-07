import { RuntimeEngine } from '../engine';
import { BaseValidatorRunner } from '../validators/base/runner';
import { FixRunner } from '../autofix/base/runner';
import { PipelineStep } from './pipeline-builder';

export class PipelineExecutor {
  private engine = new RuntimeEngine();
  private validatorRunner = new BaseValidatorRunner();
  private fixRunner = new FixRunner();

  async executeStep(repoRoot: string, filesList: string[], step: PipelineStep): Promise<any> {
    if (step.type === 'validate') {
      return await this.validatorRunner.runValidators(step.targetIds, repoRoot, filesList);
    }

    if (step.type === 'autofix') {
      // Formulate findings structure to apply fixes
      return await this.fixRunner.runFixes({
        repoRoot,
        findings: step.targetIds.map(id => ({
          ruleId: id.replace('VAL-', ''),
          severity: 'high',
          file: filesList[0] || '',
          line: 1,
          evidence: 'Auto verification',
          recommendation: 'Fix it'
        })),
        dryRun: false
      });
    }

    return { step: step.name, success: true };
  }
}
