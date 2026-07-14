import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { RuntimeReporter } from './index';
import { RuntimeTelemetrySummary } from '../telemetry/types';
import { RuntimeFinding } from '../runtime-finding';

const workspaceRoot = resolve(__dirname, '../../../../');
const DEFAULT_REPORT_PATH = resolve(workspaceRoot, 'reports/ui-governance/telemetry.json');

export class JsonReporter implements RuntimeReporter {
  private reportPath: string;

  constructor(reportPath = DEFAULT_REPORT_PATH) {
    this.reportPath = reportPath;
  }

  public async reportSummary(summary: RuntimeTelemetrySummary): Promise<void> {
    const dir = dirname(this.reportPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.reportPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`💾 Saved structured runtime telemetry to: ${this.reportPath}`);
  }

  public async reportFindings(findings: RuntimeFinding[]): Promise<void> {
    const findingsPath = resolve(dirname(this.reportPath), 'findings.json');
    const dir = dirname(findingsPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(findingsPath, JSON.stringify(findings, null, 2), 'utf8');
  }
}
