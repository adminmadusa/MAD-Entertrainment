import { ExecutionPlan } from './task-planner';

export interface PipelineStep {
  name: string;
  type: 'validate' | 'execute-skill' | 'autofix' | 'report';
  targetIds: string[];
}

export class PipelineBuilder {
  buildPipeline(plan: ExecutionPlan): PipelineStep[] {
    const steps: PipelineStep[] = [
      {
        name: 'Validate target states',
        type: 'validate',
        targetIds: plan.validators
      }
    ];

    if (plan.autofixEnabled) {
      steps.push({
        name: 'Apply automatic fixes',
        type: 'autofix',
        targetIds: plan.validators
      });
    }

    steps.push({
      name: 'Generate execution reports',
      type: 'report',
      targetIds: [plan.template]
    });

    return steps;
  }
}
