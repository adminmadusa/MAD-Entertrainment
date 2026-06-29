// scripts/governance/core/metrics_engine.ts
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { Finding, GovernanceMetrics, PerformanceGuardrails } from './types';
import { RuleRegistry } from '../rules/registry';
import { metricsDir } from './finding_manager';

export class MetricsEngine {
  private static trendMetricsFile = join(metricsDir, 'trend-metrics.json');

  /**
   * Compiles the weighted scores and counts based on all findings.
   */
  public static calculate(allFindings: Finding[]): GovernanceMetrics {
    let total = allFindings.length;
    let newCount = 0;
    let closedCount = 0;
    let regressionCount = 0;
    let fpCount = 0;
    let totalConfidence = 0;
    let resolutionTimes: number[] = [];

    // Category deduction maps
    const deductions: Record<string, number> = {
      CRITICAL: 15,
      ERROR: 10,
      WARNING: 5,
      INFO: 1,
    };

    const scores = {
      architecture: 100,
      security: 100,
      performance: 100,
      accessibility: 100,
      uiConsistency: 100,
      technicalDebt: 100,
      testing: 100,
      documentation: 100,
      maintainability: 100,
    };

    for (const finding of allFindings) {
      totalConfidence += finding.confidence;

      if (finding.status === 'NEW') newCount++;
      if (finding.status === 'CLOSED') closedCount++;
      if (finding.status === 'REGRESSION') regressionCount++;
      if (finding.status === 'FALSE_POSITIVE') fpCount++;

      // Compute average resolution time if closed
      if (finding.status === 'CLOSED') {
        const start = new Date(finding.createdDate).getTime();
        const end = new Date(finding.lastDetected).getTime(); // Last detected serves as close-time in stateless reconcile
        if (end > start) {
          resolutionTimes.push(end - start);
        }
      }

      // Deduct points from scores if finding is active
      const isActive =
        finding.status === 'NEW' ||
        finding.status === 'CONFIRMED' ||
        finding.status === 'REGRESSION';

      if (isActive) {
        const rule = RuleRegistry.getRule(finding.rule);
        const severity = rule?.severity || 'WARNING';
        const deduction = deductions[severity] || 5;

        // Categorize deduction
        const ruleCat = rule?.category || 'HYGIENE';
        if (ruleCat === 'ARCHITECTURE') {
          scores.architecture = Math.max(0, scores.architecture - deduction);
        } else if (ruleCat === 'SECURITY') {
          scores.security = Math.max(0, scores.security - deduction);
        } else if (ruleCat === 'PERFORMANCE') {
          scores.performance = Math.max(0, scores.performance - deduction);
        } else if (ruleCat === 'ACCESSIBILITY') {
          scores.accessibility = Math.max(0, scores.accessibility - deduction);
        } else if (ruleCat === 'UI' || ruleCat === 'UX') {
          scores.uiConsistency = Math.max(0, scores.uiConsistency - deduction);
        }

        // Technical Debt tracking
        if (finding.rule.includes('LEGACY') || finding.rule.includes('DUPLICATE')) {
          scores.technicalDebt = Math.max(0, scores.technicalDebt - deduction);
        }
        if (finding.rule.includes('HYGIENE') || finding.rule.includes('DEAD')) {
          scores.maintainability = Math.max(0, scores.maintainability - deduction);
        }
        if (finding.rule.includes('DOC')) {
          scores.documentation = Math.max(0, scores.documentation - deduction);
        }
        if (finding.rule.includes('TST') || finding.rule.includes('TEST')) {
          scores.testing = Math.max(0, scores.testing - deduction);
        }
      }
    }

    const falsePositiveRate = total > 0 ? fpCount / total : 0;
    const averageConfidence = total > 0 ? totalConfidence / total : 1.0;
    const averageResolutionTimeMs =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : 0;

    // Overall score as weighted average
    const overall = Math.round(
      (scores.architecture * 0.15 +
        scores.security * 0.2 +
        scores.performance * 0.1 +
        scores.accessibility * 0.15 +
        scores.uiConsistency * 0.1 +
        scores.technicalDebt * 0.1 +
        scores.testing * 0.05 +
        scores.documentation * 0.05 +
        scores.maintainability * 0.1)
    );

    const metrics: GovernanceMetrics = {
      totalFindings: total,
      newFindings: newCount,
      closedFindings: closedCount,
      regressionCount,
      falsePositiveRate,
      averageConfidence,
      averageResolutionTimeMs,
      scores: {
        ...scores,
        overall,
      },
    };

    // Persist metrics trends
    this.saveTrendMetrics(metrics);

    return metrics;
  }

  private static saveTrendMetrics(metrics: GovernanceMetrics) {
    let trends: any[] = [];
    if (existsSync(this.trendMetricsFile)) {
      try {
        const content = readFileSync(this.trendMetricsFile, 'utf8');
        trends = JSON.parse(content);
        if (!Array.isArray(trends)) trends = [];
      } catch (e) {
        // Start fresh trends array
      }
    }

    trends.push({
      timestamp: new Date().toISOString(),
      ...metrics,
    });

    // Cap at last 50 entries
    if (trends.length > 50) {
      trends = trends.slice(trends.length - 50);
    }

    writeFileSync(this.trendMetricsFile, JSON.stringify(trends, null, 2), 'utf8');
  }

  /**
   * Evaluates self-performance timings and warns on slow builds.
   */
  public static monitorPerformance(guardrails: PerformanceGuardrails) {
    const memoryLimitBytes = 250 * 1024 * 1024; // 250MB guardrail
    const timeLimitMs = 5000; // 5 seconds orchestrator limit

    console.log('\n⏱️ Governance Performance Self-Monitoring Guardrails:');
    console.log(`- Total Duration: ${guardrails.totalScanDurationMs}ms`);
    console.log(`- AST Parsing: ${guardrails.astParsingTimeMs}ms`);
    console.log(`- Graph Build: ${guardrails.dependencyGraphBuildTimeMs}ms`);
    console.log(`- Validators: ${guardrails.validatorExecutionTimeMs}ms`);
    console.log(`- Memory Usage: ${(guardrails.memoryUsageBytes / 1024 / 1024).toFixed(2)} MB`);

    if (guardrails.totalScanDurationMs > timeLimitMs) {
      console.warn(`[PERF ALERT] Governance pipeline executed slower than ${timeLimitMs}ms.`);
    }
    if (guardrails.memoryUsageBytes > memoryLimitBytes) {
      console.warn(`[PERF ALERT] Governance pipeline memory usage exceeded ${(memoryLimitBytes / 1024 / 1024).toFixed(2)} MB.`);
    }
  }
}
export const ruleRegistryVersion = '1.0.0';
