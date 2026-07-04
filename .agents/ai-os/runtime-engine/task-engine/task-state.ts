export const TASK_STATES = {
  IDLE: 'Idle',
  INTENT_DETECTION: 'Intent Detection',
  CONTEXT_RESOLUTION: 'Context Resolution',
  PLANNING: 'Planning',
  EXECUTION: 'Execution',
  VALIDATION: 'Validation',
  AUTOFIX: 'Autofix',
  REVALIDATION: 'Revalidation',
  REPORTING: 'Reporting',
  COMPLETED: 'Completed',
  FAILED: 'Failed'
} as const;

export type TaskState = typeof TASK_STATES[keyof typeof TASK_STATES];
