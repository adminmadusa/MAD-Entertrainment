import { AuditReport, ValidatorResult } from './types';
import { join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

export class ReportGenerator {
  generateAuditReport(
    sessionId: string,
    taskId: string,
    durationMs: number,
    findings: ValidatorResult[]
  ): AuditReport {
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    for (const f of findings) {
      if (f.severity === 'critical') criticalCount++;
      else if (f.severity === 'high') highCount++;
      else if (f.severity === 'medium') mediumCount++;
      else if (f.severity === 'low') lowCount++;
    }

    const success = criticalCount === 0 && highCount === 0;

    return {
      metadata: {
        sessionId,
        taskId,
        timestamp: Date.now(),
        durationMs
      },
      summary: {
        success,
        criticalCount,
        highCount,
        mediumCount,
        lowCount
      },
      findings,
      recommendations: findings.map(f => f.recommendation)
    };
  }

  async persistReport(repoRoot: string, report: AuditReport, category: string): Promise<string> {
    const reportsDir = join(repoRoot, 'reports', category);
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }

    const filePath = join(reportsDir, `report_${report.metadata.sessionId}.json`);
    writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
    return filePath;
  }
}
