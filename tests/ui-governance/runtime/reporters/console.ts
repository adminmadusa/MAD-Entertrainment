import { RuntimeReporter } from './index';
import { RuntimeTelemetrySummary } from '../telemetry/types';
import { RuntimeFinding } from '../runtime-finding';

export class ConsoleReporter implements RuntimeReporter {
  public async reportSummary(summary: RuntimeTelemetrySummary): Promise<void> {
    console.log('\n==================================================');
    console.log('📊   UI Governance Playwright Telemetry Summary');
    console.log('==================================================');
    console.log(`Run Date:        ${summary.runDate}`);
    console.log(`Total Runs:      ${summary.totalRuns}`);
    console.log(`Rules Executed:  ${summary.rulesExecuted.join(', ')}`);
    console.log(`Total Duration:  ${summary.totalDurationMs} ms`);
    console.log(`Total Violations: ${summary.totalViolations}`);
    console.log('==================================================\n');
  }

  public async reportFindings(findings: RuntimeFinding[]): Promise<void> {
    if (findings.length === 0) {
      console.log('✅ All runtime checks passed with zero findings.');
      return;
    }

    console.log(`❌ Flagged ${findings.length} runtime findings:`);
    for (const finding of findings) {
      console.log(`  - [${finding.ruleId}] (${finding.viewport}) on ${finding.page}`);
      console.log(`    Message:  ${finding.message}`);
      if (finding.selector) {
        console.log(`    Selector: ${finding.selector}`);
      }
      if (finding.screenshotPath) {
        console.log(`    Evidence: ${finding.screenshotPath}`);
      }
    }
  }
}
