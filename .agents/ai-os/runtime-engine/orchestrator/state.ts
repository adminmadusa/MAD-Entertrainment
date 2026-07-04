export const ORCHESTRATOR_STATES = {
  IDLE: 'Idle',
  DISCOVERY: 'Discovery',
  PLANNING: 'Planning',
  PIPELINE_BUILD: 'Pipeline Build',
  EXECUTION: 'Execution',
  VALIDATION: 'Validation',
  AUTOFIX: 'Autofix',
  REPORTING: 'Reporting',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  RECOVERY: 'Recovery'
} as const;

export type OrchestratorState = typeof ORCHESTRATOR_STATES[keyof typeof ORCHESTRATOR_STATES];
