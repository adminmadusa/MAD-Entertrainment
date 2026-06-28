import { PlanGraphNode } from './execution-planner';

export class WorkflowBuilder {
  buildWorkflow(plan: PlanGraphNode[]): PlanGraphNode[] {
    return plan;
  }
}
export const workflowBuilder = new WorkflowBuilder();
