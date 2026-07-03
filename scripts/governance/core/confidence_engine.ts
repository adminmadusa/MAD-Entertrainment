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

    // 4. 95% to 100% confidence honors the rule definition's CI policy
    if (rule) {
      return rule.ciPolicy;
    }

    return 'FAIL_BUILD';
  }
}
