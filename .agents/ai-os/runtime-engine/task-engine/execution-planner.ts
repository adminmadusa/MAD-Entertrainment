import { IntentResult, TaskContext } from './types';

export interface PlanGraphNode {
  name: string;
  action: string;
}

export class ExecutionPlanner {
  planGraph(intent: IntentResult, context: TaskContext): PlanGraphNode[] {
    return [
      { name: 'Load Context', action: 'load' },
      { name: 'Validate target states', action: 'validate' },
      { name: 'Apply automatic fixes', action: 'autofix' },
      { name: 'Generate execution reports', action: 'report' }
    ];
  }
}
export const executionPlanner = new ExecutionPlanner();
