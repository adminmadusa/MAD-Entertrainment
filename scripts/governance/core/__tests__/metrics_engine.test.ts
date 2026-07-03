import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { MetricsEngine } from '../metrics_engine';
import { RuleRegistry } from '../../rules/registry';
import { Finding } from '../types';

describe('MetricsEngine (Governance Scoring Logic)', () => {
  const createMockFinding = (id: string, ruleId: string, status: any): Finding => ({
    id,
    rule: ruleId,
    ruleVersion: '1.0.0',
    engineVersion: '1.0.0',
    domain: 'Architecture',
    owner: 'Architecture Review Board',
    package: 'web',
    feature: 'Button',
    status,
    confidence: 1.0,
    relationships: [],
    evidence: {
      path: 'apps/web/src/components/Button.tsx',
      message: 'Raw HTML button used',
    },
    createdDate: new Date().toISOString(),
    firstDetected: new Date().toISOString(),
    lastDetected: new Date().toISOString(),
  });

  beforeAll(() => {
    // Intercept trend metrics file-writes to avoid polluting production metrics
    vi.spyOn(MetricsEngine as any, 'saveTrendMetrics').mockImplementation(() => {});

    // Stub RuleRegistry to resolve categories deterministically
    vi.spyOn(RuleRegistry, 'getRule').mockImplementation((id: string) => {
      if (id === 'VAL-SEC-001') {
        return {
          id: 'VAL-SEC-001',
          name: 'Secret scanning',
          category: 'SECURITY',
          severity: 'CRITICAL',
          confidence: 1.0,
          defaultLifecycle: 'NEW',
          ciPolicy: 'FAIL_BUILD',
          owner: 'Security Guild',
          version: '1.0.0',
          documentationLink: '',
        };
      }
      if (id === 'VAL-UI-001') {
        return {
          id: 'VAL-UI-001',
          name: 'Button Standard',
          category: 'UI',
          severity: 'WARNING',
          confidence: 1.0,
          defaultLifecycle: 'NEW',
          ciPolicy: 'WARN',
          owner: 'Architecture Review Board',
          version: '1.0.0',
          documentationLink: '',
        };
      }
      return undefined;
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('should return a perfect score of 100 for all categories when findings list is empty', () => {
    const metrics = MetricsEngine.calculate([]);

    expect(metrics.totalFindings).toBe(0);
    expect(metrics.scores.architecture).toBe(100);
    expect(metrics.scores.security).toBe(100);
    expect(metrics.scores.uiConsistency).toBe(100);
    expect(metrics.scores.overall).toBe(100);
  });

  it('should reduce respective category scores when active violations are present', () => {
    const finding1 = createMockFinding('SEC-001', 'VAL-SEC-001', 'NEW'); // Active CRITICAL deduction = 15
    const finding2 = createMockFinding('UI-001', 'VAL-UI-001', 'REGRESSION'); // Active WARNING deduction = 5

    const metrics = MetricsEngine.calculate([finding1, finding2]);

    expect(metrics.scores.security).toBe(85); // 100 - 15
    expect(metrics.scores.uiConsistency).toBe(95); // 100 - 5
    expect(metrics.scores.overall).toBeLessThan(100);
  });

  it('should not deduct points from scores for CLOSED or FALSE_POSITIVE/IGNORED findings', () => {
    const closedFinding = createMockFinding('SEC-002', 'VAL-SEC-001', 'CLOSED');
    const fpFinding = createMockFinding('UI-002', 'VAL-UI-001', 'FALSE_POSITIVE');

    const metrics = MetricsEngine.calculate([closedFinding, fpFinding]);

    expect(metrics.scores.security).toBe(100);
    expect(metrics.scores.uiConsistency).toBe(100);
  });

  it('should cap scores at a minimum bound of 0', () => {
    // Generate 10 active critical security findings to exceed 100 points deduction (10 * 15 = 150)
    const findings: Finding[] = [];
    for (let i = 0; i < 10; i++) {
      findings.push(createMockFinding(`SEC-${i}`, 'VAL-SEC-001', 'NEW'));
    }

    const metrics = MetricsEngine.calculate(findings);

    expect(metrics.scores.security).toBe(0);
  });
});
