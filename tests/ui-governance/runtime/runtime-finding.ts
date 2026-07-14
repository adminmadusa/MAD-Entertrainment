export interface RuntimeFinding {
  ruleId: string;
  severity: string;
  page: string;
  viewport: string;
  selector?: string;
  message: string;
  screenshotPath?: string;
}
