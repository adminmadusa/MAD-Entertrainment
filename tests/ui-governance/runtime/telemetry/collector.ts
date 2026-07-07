import { RuntimeTelemetryEntry, RuntimeTelemetrySummary } from './types';

export class TelemetryCollector {
  private static entries: RuntimeTelemetryEntry[] = [];

  public static addEntry(entry: RuntimeTelemetryEntry) {
    this.entries.push(entry);
  }

  public static clear() {
    this.entries = [];
  }

  public static getEntries(): RuntimeTelemetryEntry[] {
    return this.entries;
  }

  public static getSummary(): RuntimeTelemetrySummary {
    const rules = new Set<string>();
    let totalViolations = 0;
    let totalDurationMs = 0;

    for (const entry of this.entries) {
      rules.add(entry.ruleId);
      totalViolations += entry.violationsCount;
      totalDurationMs += entry.durationMs;
    }

    return {
      runDate: new Date().toISOString().split('T')[0],
      rulesExecuted: Array.from(rules),
      totalRuns: this.entries.length,
      totalViolations,
      totalDurationMs,
      entries: this.entries
    };
  }
}
