export interface RuntimeTelemetryEntry {
  ruleId: string;
  page: string;
  viewport: string;
  durationMs: number;
  elementsChecked: number;
  violationsCount: number;
  status: 'PASS' | 'FAIL';
}

export interface RuntimeTelemetrySummary {
  schemaVersion: string;
  runDate: string;
  rulesExecuted: string[];
  totalRuns: number;
  totalViolations: number;
  totalDurationMs: number;
  entries: RuntimeTelemetryEntry[];
}
