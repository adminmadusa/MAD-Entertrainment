// scripts/governance/core/analytics_types.ts

export const ANALYTICS_SCHEMA_VERSION = 1;

export interface SessionProvider {
  list(): any[];
}

export interface RollbackProvider {
  list(): any[];
}

export interface RepositoryAnalytics {
  schemaVersion: number;
  generatedAt: string;
  overallScore: number;
  categoryScores: {
    architecture: number;
    security: number;
    performance: number;
    accessibility: number;
    uiConsistency: number;
    technicalDebt: number;
    testing: number;
    documentation: number;
    maintainability: number;
  };
  findings: {
    total: number;
    active: number;
    closed: number;
    regressions: number;
    falsePositives: number;
  };
  kpis: {
    averageResolutionTimeMs: number;
    averageConfidence: number;
    autoFixCoverage: number;
    regressionRate: number;
  };
}

export interface RuleAnalytics {
  ruleId: string;
  ruleName: string;
  category: string;
  severity: string;
  activeCount: number;
  resolvedCount: number;
  regressionCount: number;
  fixable: boolean;
  fixCoverage: number;
  avgResolutionTimeMs: number;
}

export interface FixAnalytics {
  totalApplied: number;
  totalSucceeded: number;
  totalFailed: number;
  totalRolledBack: number;
  successRate: number;
  rollbackRate: number;
}

export interface SessionSummary {
  sessionId: string;
  mode: string;
  startedAt: string;
  finishedAt: string;
  status: string;
  totalApplied: number;
  totalSkipped: number;
  rollbackId?: string;
}

export interface TrendAnalyticsPoint {
  timestamp: string;
  overallScore: number;
  totalFindings: number;
  activeFindings: number;
  closedFindings: number;
}

export interface AnalyticsResult {
  repository: RepositoryAnalytics;
  trends: TrendAnalyticsPoint[];
  rules: RuleAnalytics[];
  fixes: FixAnalytics;
  sessions: SessionSummary[];
}
