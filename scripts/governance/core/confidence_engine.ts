// scripts/governance/core/confidence_engine.ts
import { Finding } from './types';
import { RuleRegistry } from '../rules/registry';

export type GatingAction = 'FAIL_BUILD' | 'WARN' | 'INFO_ONLY' | 'MANUAL_REVIEW_REQUIRED';

export class ConfidenceEngine {
  /**
   * Resolves the CI enforcement policy action for a given finding.
   */
  public static evaluate(finding: Finding): GatingAction {
    const rule = RuleRegistry.getRule(finding.rule);
    const confidence = finding.confidence;

    // Findings that are bypasses or already resolved should not trigger gating
    if (
      finding.status === 'FALSE_POSITIVE' ||
      finding.status === 'IGNORED' ||
      finding.status === 'CLOSED' ||
      finding.status === 'VERIFIED'
    ) {
      return 'INFO_ONLY';
    }

    // AST Parse Warnings should never fail the build
    if (finding.rule === 'AST-PARSE-WARNING') {
      return 'WARN';
    }

    // In-code suppressed findings should never fail the build
    if (finding.evidence.message.includes('[SUPPRESSED]')) {
      return 'INFO_ONLY';
    }

    // 1. Below 70% confidence requires manual review only
    if (confidence < 0.70) {
      return 'MANUAL_REVIEW_REQUIRED';
    }

    // 2. 70% to 90% confidence is marked review required (INFO_ONLY)
    if (confidence < 0.90) {
      return 'INFO_ONLY';
    }

    // 3. 90% to 95% confidence is treated as a high-priority warning
    if (confidence < 0.95) {
      return 'WARN';
    }

    // 4. 95% to 100% confidence honors the rule definition's ciPolicy and severity
    if (rule) {
      if (rule.ciPolicy) {
        return rule.ciPolicy;
      }
      const severity = rule.severity;
      if (severity === 'CRITICAL') {
        return 'FAIL_BUILD';
      }
      if (severity === 'HIGH' || severity === 'ERROR') {
        const failOnHigh = process.env.GOVERNANCE_FAIL_ON_HIGH !== 'false';
        return failOnHigh ? 'FAIL_BUILD' : 'WARN';
      }
      if (severity === 'MEDIUM' || severity === 'WARNING') {
        return 'WARN';
      }
      if (severity === 'LOW' || severity === 'INFO') {
        return 'INFO_ONLY';
      }
      return 'FAIL_BUILD';
    }

    return 'FAIL_BUILD';
  }
}
