import { AuditReport } from '../types';
import { ReportGenerator } from '../report-generator';

export class ReportController {
  private generator = new ReportGenerator();

  async writeReport(
    repoRoot: string,
    report: AuditReport,
    category: string
  ): Promise<string> {
    return await this.generator.persistReport(repoRoot, report, category);
  }
}
export const reportController = new ReportController();
