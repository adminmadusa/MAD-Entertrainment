import { describe, it, expect, vi } from 'vitest';
import { ConfidenceEngine } from '../confidence_engine';
import { RuleRegistry } from '../../rules/registry';
import { Finding } from '../types';

describe('ConfidenceEngine (CI Gating Policy Evaluation)', () => {
  const baseFinding: Finding = {
    id: 'UI-100-001',
    rule: 'VAL-UI-001',
    ruleVersion: '1.0.0',
    engineVersion: '1.0.0',
    domain: 'Architecture',
    owner: 'Architecture Owner',
    package: 'web',
    feature: 'Button',
    status: 'NEW',
    confidence: 1.0,
    relationships: [],
    evidence: {
      path: 'apps/web/src/components/Button.tsx',
      message: 'Raw HTML button used',
    },
    createdDate: new Date().toISOString(),
    firstDetected: new Date().toISOString(),
    lastDetected: new Date().toISOString(),
  };

  it('should bypass gating and return INFO_ONLY for closed, false positive, verified, or ignored findings', () => {
    const statusesToBypass = ['CLOSED', 'FALSE_POSITIVE', 'VERIFIED', 'IGNORED'] as const;

    for (const status of statusesToBypass) {
      const finding = { ...baseFinding, status };
      const action = ConfidenceEngine.evaluate(finding);
      expect(action).toBe('INFO_ONLY');
    }
  });

  it('should return MANUAL_REVIEW_REQUIRED for findings with confidence below 70%', () => {
    const finding = { ...baseFinding, status: 'NEW', confidence: 0.69 };
    const action = ConfidenceEngine.evaluate(finding);
    expect(action).toBe('MANUAL_REVIEW_REQUIRED');
  });

  it('should return INFO_ONLY for findings with confidence between 70% and 89%', () => {
    const finding1 = { ...baseFinding, status: 'NEW', confidence: 0.70 };
    const finding2 = { ...baseFinding, status: 'NEW', confidence: 0.89 };

    expect(ConfidenceEngine.evaluate(finding1)).toBe('INFO_ONLY');
    expect(ConfidenceEngine.evaluate(finding2)).toBe('INFO_ONLY');
  });

  it('should return WARN for findings with confidence between 90% and 94%', () => {
    const finding1 = { ...baseFinding, status: 'NEW', confidence: 0.90 };
    const finding2 = { ...baseFinding, status: 'NEW', confidence: 0.94 };

    expect(ConfidenceEngine.evaluate(finding1)).toBe('WARN');
    expect(ConfidenceEngine.evaluate(finding2)).toBe('WARN');
  });

  it('should fallback to FAIL_BUILD when the rule definition is missing from the registry', () => {
    vi.spyOn(RuleRegistry, 'getRule').mockReturnValue(undefined);

    const finding = { ...baseFinding, status: 'NEW', confidence: 0.95 };
    const action = ConfidenceEngine.evaluate(finding);
    expect(action).toBe('FAIL_BUILD');

    vi.restoreAllMocks();
  });

  it('should resolve to the registered rule ciPolicy when confidence is 95% or higher', () => {
    // 1. Mock rule with FAIL_BUILD policy
    vi.spyOn(RuleRegistry, 'getRule').mockReturnValue({
      id: 'VAL-UI-001',
      name: 'Test Rule',
      category: 'UI',
      severity: 'ERROR',
      confidence: 1.0,
      defaultLifecycle: 'NEW',
      ciPolicy: 'FAIL_BUILD',
      owner: 'Architecture Review Board',
      version: '1.0.0',
      documentationLink: '',
    });

    const findingFail = { ...baseFinding, status: 'NEW', confidence: 0.95 };
    expect(ConfidenceEngine.evaluate(findingFail)).toBe('FAIL_BUILD');

    // 2. Mock rule with WARN policy
    vi.spyOn(RuleRegistry, 'getRule').mockReturnValue({
      id: 'VAL-UI-001',
      name: 'Test Rule',
      category: 'UI',
      severity: 'WARNING',
      confidence: 1.0,
      defaultLifecycle: 'NEW',
      ciPolicy: 'WARN',
      owner: 'Architecture Review Board',
      version: '1.0.0',
      documentationLink: '',
    });

    const findingWarn = { ...baseFinding, status: 'NEW', confidence: 0.95 };
    expect(ConfidenceEngine.evaluate(findingWarn)).toBe('WARN');

    vi.restoreAllMocks();
  });
});
