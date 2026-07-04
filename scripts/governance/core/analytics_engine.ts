// scripts/governance/core/analytics_engine.ts
import { RuleRegistry } from '../rules/registry';
import {
  ANALYTICS_SCHEMA_VERSION,
  type AnalyticsResult,
  type FixAnalytics,
  type FixRegistryProvider,
  type HistoryProvider,
  type RepositoryAnalytics,
  type RollbackProvider,
  type RuleAnalytics,
  type SessionProvider,
  type SessionSummary,
  type TrendAnalyticsPoint,
} from './analytics_types';
import type { Finding, GovernanceMetrics, HistoryEvent } from './types';

export class AnalyticsEngine {
  /**
   * Compiles the unified analytics result from findings, metrics, and providers.
   */
  public static compile(
    findings: Finding[],
    metrics: GovernanceMetrics,
    sessionProvider: SessionProvider,
    rollbackProvider: RollbackProvider,
    historyProvider: HistoryProvider,
    fixRegistryProvider: FixRegistryProvider,
    trendProvider: { getTrends(): any[] },
    generatedAt: string
  ): AnalyticsResult {
    // 1. Compile Repository Analytics
    const active = findings.filter(
      (f) => f.status === 'NEW' || f.status === 'CONFIRMED' || f.status === 'REGRESSION'
    );
    const closed = findings.filter((f) => f.status === 'CLOSED');
    const regressions = findings.filter((f) => f.status === 'REGRESSION');
    const falsePositives = findings.filter(
      (f) => f.status === 'FALSE_POSITIVE' || f.status === 'IGNORED'
    );

    const totalClosed = closed.length;
    let autoClosedCount = 0;

    for (const f of closed) {
      const history = historyProvider.getHistory(f.id) || [];
      const hasAutoClosed = history.some(
        (e: HistoryEvent) => e.action === 'AUTO_CLOSED' || e.action === 'FIX_VERIFIED'
      );
      if (hasAutoClosed) {
        autoClosedCount++;
      }
    }

    const autoFixCoverage = totalClosed > 0 ? autoClosedCount / totalClosed : 0;
    const regressionRate = totalClosed > 0 ? regressions.length / totalClosed : 0;

    const repository: RepositoryAnalytics = {
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      generatedAt,
      overallScore: metrics.scores.overall,
      categoryScores: {
        architecture: metrics.scores.architecture,
        security: metrics.scores.security,
        performance: metrics.scores.performance,
        accessibility: metrics.scores.accessibility,
        uiConsistency: metrics.scores.uiConsistency,
        technicalDebt: metrics.scores.technicalDebt,
        testing: metrics.scores.testing,
        documentation: metrics.scores.documentation,
        maintainability: metrics.scores.maintainability,
      },
      findings: {
        total: findings.length,
        active: active.length,
        closed: totalClosed,
        regressions: regressions.length,
        falsePositives: falsePositives.length,
      },
      kpis: {
        averageResolutionTimeMs: metrics.averageResolutionTimeMs,
        averageConfidence: metrics.averageConfidence,
        autoFixCoverage,
        regressionRate,
      },
    };

    // 2. Compile Rule Analytics
    const rulesMap = new Map<string, Finding[]>();
    for (const f of findings) {
      if (!rulesMap.has(f.rule)) {
        rulesMap.set(f.rule, []);
      }
      rulesMap.get(f.rule)!.push(f);
    }

    const rulesList: RuleAnalytics[] = [];
    const allRegisteredRules = RuleRegistry.getAllRules();

    // Ensure we list all registered rules, plus any untracked rules found in findings
    const ruleIds = new Set([
      ...allRegisteredRules.map((r) => r.id),
      ...rulesMap.keys(),
    ]);

    for (const ruleId of ruleIds) {
      const ruleFindings = rulesMap.get(ruleId) || [];
      const ruleDef = RuleRegistry.getRule(ruleId);

      const ruleActive = ruleFindings.filter(
        (f) => f.status === 'NEW' || f.status === 'CONFIRMED' || f.status === 'REGRESSION'
      );
      const ruleClosed = ruleFindings.filter((f) => f.status === 'CLOSED');
      const ruleRegressions = ruleFindings.filter((f) => f.status === 'REGRESSION');

      let ruleAutoClosed = 0;
      let totalResolutionTime = 0;

      for (const f of ruleClosed) {
        const history = historyProvider.getHistory(f.id) || [];
        const hasAutoClosed = history.some(
          (e: HistoryEvent) => e.action === 'AUTO_CLOSED' || e.action === 'FIX_VERIFIED'
        );
        if (hasAutoClosed) {
          ruleAutoClosed++;
        }

        const start = new Date(f.createdDate).getTime();
        const end = new Date(f.lastDetected).getTime();
        if (end > start) {
          totalResolutionTime += end - start;
        }
      }

      const ruleClosedCount = ruleClosed.length;
      const ruleFixCoverage = ruleClosedCount > 0 ? ruleAutoClosed / ruleClosedCount : 0;
      const avgResolutionTimeMs = ruleClosedCount > 0 ? totalResolutionTime / ruleClosedCount : 0;

      rulesList.push({
        ruleId,
        ruleName: ruleDef?.name || ruleId,
        category: ruleDef?.category || 'HYGIENE',
        severity: ruleDef?.severity || 'WARNING',
        activeCount: ruleActive.length,
        resolvedCount: ruleClosedCount,
        regressionCount: ruleRegressions.length,
        fixable: fixRegistryProvider.supports(ruleId),
        fixCoverage: ruleFixCoverage,
        avgResolutionTimeMs,
      });
    }

    // Sort Rules deterministically (alphabetically by Rule ID)
    rulesList.sort((a, b) => a.ruleId.localeCompare(b.ruleId));

    // 3. Compile Session Summaries
    const rawSessions = sessionProvider.list() || [];
    const sessionsList: SessionSummary[] = rawSessions.map((s) => {
      const closedCount = Array.isArray(s.closedFindings) ? s.closedFindings.length : 0;
      const modifiedCount = Array.isArray(s.modifiedFiles) ? s.modifiedFiles.length : 0;
      const totalSkipped = Math.max(0, modifiedCount - closedCount);

      return {
        sessionId: s.sessionId,
        mode: s.executionMode || 'STANDARD',
        startedAt: s.startedAt,
        finishedAt: s.finishedAt || '',
        status: s.status,
        totalApplied: closedCount,
        totalSkipped,
        rollbackId: s.rollbackId,
      };
    });

    // Sort Sessions deterministically (newest first based on startedAt/sessionId)
    sessionsList.sort((a, b) => b.startedAt.localeCompare(a.startedAt) || b.sessionId.localeCompare(a.sessionId));

    // 4. Compile Fix Analytics
    let totalSucceeded = 0;
    let totalFailed = 0;

    for (const s of rawSessions) {
      if (Array.isArray(s.closedFindings)) {
        totalSucceeded += s.closedFindings.length;
      }
      if (Array.isArray(s.reopenedFindings)) {
        totalFailed += s.reopenedFindings.length;
      }
    }

    const rawRollbacks = rollbackProvider.list() || [];
    const totalRolledBack = rawRollbacks.filter((r) => r.restored === true).length;

    const totalApplied = totalSucceeded + totalFailed;
    const successRate = totalApplied > 0 ? totalSucceeded / totalApplied : 0;
    const rollbackRate = totalApplied > 0 ? totalRolledBack / totalApplied : 0;

    const fixes: FixAnalytics = {
      totalApplied,
      totalSucceeded,
      totalFailed,
      totalRolledBack,
      successRate,
      rollbackRate,
    };

    // 5. Compile Trends
    const rawTrends = trendProvider.getTrends() || [];
    const trendsList: TrendAnalyticsPoint[] = rawTrends.map((t) => {
      return {
        timestamp: t.timestamp,
        overallScore: t.scores?.overall ?? 0,
        totalFindings: t.totalFindings ?? 0,
        activeFindings: (t.totalFindings ?? 0) - (t.closedFindings ?? 0),
        closedFindings: t.closedFindings ?? 0,
      };
    });

    // Sort Trends chronologically
    trendsList.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return {
      repository,
      trends: trendsList,
      rules: rulesList,
      fixes,
      sessions: sessionsList,
    };
  }
}
