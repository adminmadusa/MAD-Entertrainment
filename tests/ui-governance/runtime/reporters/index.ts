import { RuntimeTelemetrySummary } from '../telemetry/types';
import { RuntimeFinding } from '../runtime-finding';
export { ConsoleReporter } from './console';
export { JsonReporter } from './json';

export interface RuntimeReporter {
  reportSummary(summary: RuntimeTelemetrySummary): Promise<void>;
  reportFindings(findings: RuntimeFinding[]): Promise<void>;
}

export class ReporterRegistry {
  private static reporters: RuntimeReporter[] = [];

  public static register(reporter: RuntimeReporter) {
    this.reporters.push(reporter);
  }

  public static clear() {
    this.reporters = [];
  }

  public static async reportSummary(summary: RuntimeTelemetrySummary): Promise<void> {
    for (const reporter of this.reporters) {
      await reporter.reportSummary(summary);
    }
  }

  public static async reportFindings(findings: RuntimeFinding[]): Promise<void> {
    for (const reporter of this.reporters) {
      await reporter.reportFindings(findings);
    }
  }
}
