// scripts/governance/core/report_engine.ts
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { Finding, GovernanceMetrics } from './types';
import { RuleRegistry } from '../rules/registry';
import { ConfidenceEngine } from './confidence_engine';

export class ReportEngine {
  private static workspaceRoot = resolve(__dirname, '../../..');
  private static reportsDir = resolve(ReportEngine.workspaceRoot, 'reports/governance');

  constructor() {
    if (!existsSync(ReportEngine.reportsDir)) {
      mkdirSync(ReportEngine.reportsDir, { recursive: true });
    }
  }

  /**
   * Generates a comprehensive repository-wide governance report.
   */
  private getTrendStats(findings: Finding[]): {
    newCount: number;
    resolvedCount: number;
    reopenedCount: number;
    suppressedCount: number;
    netChange: number;
  } {
    const activeDir = join(ReportEngine.workspaceRoot, '.governance/archive/history');
    let prevSnapshot: any = null;

    if (existsSync(activeDir)) {
      try {
        const files = require('fs').readdirSync(activeDir).filter((f: string) => f.endsWith('.json')).sort();
        if (files.length > 1) {
          const content = require('fs').readFileSync(join(activeDir, files[files.length - 2]), 'utf8');
          prevSnapshot = JSON.parse(content);
        }
      } catch (e) {}
    }

    const currentActive = findings.filter(f => f.status === 'NEW' || f.status === 'CONFIRMED' || f.status === 'REGRESSION').length;
    const prevActive = prevSnapshot ? prevSnapshot.activeCount || 0 : 0;

    const netChange = currentActive - prevActive;
    const resolvedCount = findings.filter(f => f.status === 'CLOSED').length;
    const suppressedCount = findings.filter(f => f.status === 'FALSE_POSITIVE' || f.status === 'IGNORED').length;
    const reopenedCount = findings.filter(f => f.status === 'REGRESSION').length;

    return {
      newCount: netChange > 0 ? netChange : 0,
      resolvedCount,
      reopenedCount,
      suppressedCount,
      netChange,
    };
  }

  /**
   * Generates a comprehensive repository-wide governance report.
   */
  public generateGovernanceReport(findings: Finding[], metrics: GovernanceMetrics): string {
    const active = findings.filter(f => f.status === 'NEW' || f.status === 'CONFIRMED' || f.status === 'REGRESSION');
    const closed = findings.filter(f => f.status === 'CLOSED');
    const fp = findings.filter(f => f.status === 'FALSE_POSITIVE' || f.status === 'IGNORED');
    const trends = this.getTrendStats(findings);

    let md = `# Repository Governance Report\n\n`;
    md += `**Date**: ${new Date().toUTCString()}\n`;
    md += `**Overall Governance Score**: ${metrics.scores.overall} / 100\n\n`;

    md += `## Scorecard Dashboard\n\n`;
    md += `| Category | Score | Status |\n`;
    md += `| :--- | :---: | :--- |\n`;
    md += `| Architecture | ${metrics.scores.architecture} | ${this.getScoreBadge(metrics.scores.architecture)} |\n`;
    md += `| Security | ${metrics.scores.security} | ${this.getScoreBadge(metrics.scores.security)} |\n`;
    md += `| Performance | ${metrics.scores.performance} | ${this.getScoreBadge(metrics.scores.performance)} |\n`;
    md += `| Accessibility | ${metrics.scores.accessibility} | ${this.getScoreBadge(metrics.scores.accessibility)} |\n`;
    md += `| UI Consistency | ${metrics.scores.uiConsistency} | ${this.getScoreBadge(metrics.scores.uiConsistency)} |\n`;
    md += `| Technical Debt | ${metrics.scores.technicalDebt} | ${this.getScoreBadge(metrics.scores.technicalDebt)} |\n`;
    md += `| Testing | ${metrics.scores.testing} | ${this.getScoreBadge(metrics.scores.testing)} |\n`;
    md += `| Documentation | ${metrics.scores.documentation} | ${this.getScoreBadge(metrics.scores.documentation)} |\n`;
    md += `| Maintainability | ${metrics.scores.maintainability} | ${this.getScoreBadge(metrics.scores.maintainability)} |\n\n`;

    md += `## Findings Statistics\n\n`;
    md += `- **Total Findings**: ${metrics.totalFindings}\n`;
    md += `- **Active Violations**: ${active.length}\n`;
    md += `- **Closed / Resolved**: ${closed.length}\n`;
    md += `- **Regressions**: ${metrics.regressionCount}\n`;
    md += `- **False Positives / Bypassed**: ${fp.length}\n`;
    md += `- **Average Confidence**: ${(metrics.averageConfidence * 100).toFixed(1)}%\n\n`;

    md += `## Governance Delta Trends\n\n`;
    md += `- **New Findings**: ${trends.newCount}\n`;
    md += `- **Resolved / Fixed**: ${trends.resolvedCount}\n`;
    md += `- **Reopened (Regressions)**: ${trends.reopenedCount}\n`;
    md += `- **Suppressed (Exceptions)**: ${trends.suppressedCount}\n`;
    md += `- **Net Change**: ${trends.netChange > 0 ? '+' : ''}${trends.netChange}\n\n`;

    md += `## Active Violations Matrix\n\n`;
    if (active.length === 0) {
      md += `✅ No active governance violations found.\n`;
    } else {
      md += `| ID | Rule | Severity | Confidence | Domain | File Path | Occurrences |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- | :--- | :---: |\n`;
      for (const f of active) {
        const rule = RuleRegistry.getRule(f.rule);
        md += `| **${f.id}** | ${rule?.name || f.rule} | ${rule?.severity || 'WARN'} | ${(f.confidence * 100).toFixed(0)}% | ${f.domain} | \`${f.evidence.path}\` | ${f.occurrenceCount || 1} |\n`;
      }

      md += `\n### Detailed Occurrence Log\n\n`;
      for (const f of active) {
        const rule = RuleRegistry.getRule(f.rule);
        md += `#### **${f.id}**: ${rule?.name || f.rule}\n`;
        md += `- **File**: \`${f.evidence.path}\`\n`;
        md += `- **Highest Severity**: ${rule?.severity || 'WARN'}\n`;
        md += `- **First Detected**: ${f.firstDetected}\n`;
        md += `- **Last Seen**: ${f.lastDetected}\n`;
        md += `- **Status**: ${f.status}\n`;
        md += `- **Total Occurrences**: ${f.occurrenceCount || 1}\n\n`;

        if (f.evidence.occurrences && f.evidence.occurrences.length > 0) {
          md += `| Line | Snippet | Message |\n`;
          md += `| :--- | :--- | :--- |\n`;
          for (const occ of f.evidence.occurrences) {
            md += `| L${occ.line} | \`${occ.snippet || ''}\` | ${occ.message} |\n`;
          }
          md += `\n`;
        } else {
          md += `- **Snippet**: \`${f.evidence.snippet || ''}\`\n`;
          md += `- **Message**: ${f.evidence.message}\n\n`;
        }
      }
    }

    writeFileSync(join(ReportEngine.reportsDir, 'governance-report.md'), md, 'utf8');
    return md;
  }

  /**
   * Generates a PR-specific impact report showing only violations related to the PR scope.
   */
  public generatePRReport(findings: Finding[], prAffectedFiles: Set<string>): string {
    const prFindings = findings.filter(f => prAffectedFiles.has(f.evidence.path));
    const active = prFindings.filter(f => f.status === 'NEW' || f.status === 'CONFIRMED' || f.status === 'REGRESSION');

    let md = `# Pull Request Governance Report\n\n`;
    md += `**PR Scope**: Analyzed ${prAffectedFiles.size} changed or downstream-impacted files.\n\n`;

    if (active.length === 0) {
      md += `✅ **Governance Gate Passed**: No active violations found in this PR scope.\n`;
    } else {
      md += `⚠️ **Governance Warnings**: Detected active violations in changed files:\n\n`;
      md += `| ID | Rule | Severity | Enforcement | Gating Action |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- |\n`;
      for (const f of active) {
        const rule = RuleRegistry.getRule(f.rule);
        const action = ConfidenceEngine.evaluate(f);
        md += `| **${f.id}** | ${rule?.name || f.rule} | ${rule?.severity || 'WARN'} | ${action} | ${action === 'FAIL_BUILD' ? '❌ Blocks Merge' : '⚠️ Warning'} |\n`;
      }
    }

    writeFileSync(join(ReportEngine.reportsDir, 'pr-report.md'), md, 'utf8');
    return md;
  }

  /**
   * Generates a regression report showing active findings that were previously resolved.
   */
  public generateRegressionReport(findings: Finding[]): string {
    const regressions = findings.filter(f => f.status === 'REGRESSION');

    let md = `# Governance Regression Report\n\n`;
    md += `*Regressions represent violations that were previously marked as CLOSED/RESOLVED but have reappeared in the codebase.*\n\n`;

    if (regressions.length === 0) {
      md += `✅ No regressions detected.\n`;
    } else {
      md += `| ID | Rule | Severity | Domain | Regression File Path |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- |\n`;
      for (const f of regressions) {
        const rule = RuleRegistry.getRule(f.rule);
        md += `| **${f.id}** | ${rule?.name || f.rule} | ${rule?.severity || 'WARN'} | ${f.domain} | \`${f.evidence.path}\` |\n`;
      }
    }

    writeFileSync(join(ReportEngine.reportsDir, 'regression-report.md'), md, 'utf8');
    return md;
  }

  /**
   * Generates a technical debt report outlining duplicate UI components, code, and legacy structures.
   */
  public generateTechDebtReport(findings: Finding[]): string {
    const techDebt = findings.filter(
      f =>
        (f.rule.includes('LEGACY') || f.rule.includes('DUPLICATE') || f.rule.includes('DEAD') || f.rule.includes('UI-004') || f.rule.includes('UI-006')) &&
        (f.status === 'NEW' || f.status === 'CONFIRMED' || f.status === 'REGRESSION')
    );

    let md = `# Technical Debt & Duplication Report\n\n`;

    if (techDebt.length === 0) {
      md += `✅ No outstanding technical debt findings.\n`;
    } else {
      md += `| ID | Debt Category | File Path | Impact / Refactor Suggestion |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;
      for (const f of techDebt) {
        const rule = RuleRegistry.getRule(f.rule);
        md += `| **${f.id}** | ${rule?.name || f.rule} | \`${f.evidence.path}\` | ${f.evidence.message} |\n`;
      }
    }

    writeFileSync(join(ReportEngine.reportsDir, 'tech-debt-report.md'), md, 'utf8');
    return md;
  }

  private getScoreBadge(score: number): string {
    if (score >= 90) return '🟢 PASS (Excellent)';
    if (score >= 75) return '🟡 WARN (Moderate)';
    return '🔴 FAIL (Critical Debt)';
  }
}
export const defaultReportVersion = '1.0.0';
