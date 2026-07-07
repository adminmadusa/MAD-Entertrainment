export interface ExecutionPlan {
  taskId: string;
  validators: string[];
  skills: string[];
  prompt: string;
  template: string;
  autofixEnabled: boolean;
}

export class TaskPlanner {
  generatePlan(taskId: string, category: string, autofixEnabled: boolean): ExecutionPlan {
    const defaultPlan: ExecutionPlan = {
      taskId,
      validators: ['VAL-NAM-001', 'VAL-TS-001'],
      skills: ['naming-audit', 'typescript-audit'],
      prompt: 'PRM-AUD-001',
      template: 'TMP-AUD-001',
      autofixEnabled
    };

    if (category === 'performance') {
      defaultPlan.validators.push('VAL-PRF-001');
      defaultPlan.skills.push('performance-audit');
    } else if (category === 'security') {
      defaultPlan.validators.push('VAL-SEC-001');
      defaultPlan.skills.push('security-audit');
    }

    return defaultPlan;
  }
}
