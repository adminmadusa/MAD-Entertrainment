import { PipelineStep } from '../orchestrator/pipeline-builder';
import { PipelineScheduler } from '../orchestrator/scheduler';
import { PipelineExecutor } from '../orchestrator/executor';
import { ExecutionStepResult } from './types';

export class PipelineRunner {
  private scheduler = new PipelineScheduler();
  private executor = new PipelineExecutor();

  async executePipeline(
    repoRoot: string,
    filesList: string[],
    steps: PipelineStep[]
  ): Promise<ExecutionStepResult[]> {
    const results: ExecutionStepResult[] = [];

    await this.scheduler.executeSteps(steps, async step => {
      const start = Date.now();
      const stepRes = await this.executor.executeStep(repoRoot, filesList, step);
      results.push({
        stepName: step.name,
        success: true,
        durationMs: Date.now() - start,
        results: stepRes
      });
    });

    return results;
  }
}
export const pipelineRunner = new PipelineRunner();
