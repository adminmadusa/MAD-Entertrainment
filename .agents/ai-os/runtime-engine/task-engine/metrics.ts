export interface TaskMetrics {
  durationMs: number;
  stepsCount: number;
  validatorsExecuted: number;
  fixesAppliedCount: number;
  revalidationDeltaCount: number;
}

export class TaskMetricsCollector {
  private startTime = 0;

  start() {
    this.startTime = Date.now();
  }

  collect(stepsCount: number, validatorsCount: number, fixesCount: number, deltaCount: number): TaskMetrics {
    return {
      durationMs: Date.now() - this.startTime,
      stepsCount,
      validatorsExecuted: validatorsCount,
      fixesAppliedCount: fixesCount,
      revalidationDeltaCount: deltaCount
    };
  }
}
export const taskMetricsCollector = new TaskMetricsCollector();
