import { PipelineStep } from './pipeline-builder';

export class PipelineScheduler {
  async executeSteps(
    steps: PipelineStep[],
    executeStepFn: (step: PipelineStep) => Promise<any>
  ): Promise<any[]> {
    const results: any[] = [];

    for (const step of steps) {
      let retries = 2;
      let success = false;
      let lastErr: any = null;

      while (retries > 0 && !success) {
        try {
          const res = await Promise.race([
            executeStepFn(step),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Step execution timeout')), 5000))
          ]);
          results.push(res);
          success = true;
        } catch (err: any) {
          lastErr = err;
          retries--;
        }
      }

      if (!success) {
        throw lastErr || new Error(`Failed to execute step: ${step.name}`);
      }
    }

    return results;
  }
}
