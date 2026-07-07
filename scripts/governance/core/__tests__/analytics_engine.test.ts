// scripts/governance/core/__tests__/analytics_engine.test.ts
import { describe, expect, it } from 'vitest';

import { AnalyticsEngine } from '../analytics_engine';
import type {
  FixRegistryProvider,
  HistoryProvider,
  RollbackProvider,
  SessionProvider,
} from '../analytics_types';
import type { Finding, GovernanceMetrics } from '../types';

describe('AnalyticsEngine', () => {
  const dummyMetrics: GovernanceMetrics = {
    totalFindings: 3,
    newFindings: 1,
    closedFindings: 2,
    regressionCount: 1,
    falsePositiveRate: 0,
    averageConfidence: 0.95,
    averageResolutionTimeMs: 120000,
    scores: {
      overall: 92,
      architecture: 95,
      security: 100,
      performance: 90,
      accessibility: 85,
      uiConsistency: 95,
      technicalDebt: 90,
      testing: 80,
      documentation: 95,
      maintainability: 90,
    },
  };

  const dummyFindings: Finding[] = [
    {
      id: 'f_1',
      rule: 'VAL-SEC-001',
      ruleVersion: '1.0.0',
      engineVersion: '1.0.0',
      domain: 'Security Guild',
      owner: 'Security Team',
      package: 'core',
      feature: 'auth',
      status: 'CLOSED',
      confidence: 1.0,
      relationships: [],
      evidence: { path: 'auth.ts', message: 'Violation 1' },
      createdDate: '2026-07-03T10:00:00.000Z',
      firstDetected: '2026-07-03T10:00:00.000Z',
      lastDetected: '2026-07-03T10:10:00.000Z', // 10 mins resolution
    },
    {
      id: 'f_2',
      rule: 'VAL-HYG-001',
      ruleVersion: '1.0.0',
      engineVersion: '1.0.0',
      domain: 'Platform Team',
      owner: 'Platform Team',
      package: 'core',
      feature: 'formatting',
      status: 'CLOSED',
      confidence: 0.9,
      relationships: [],
      evidence: { path: 'styles.css', message: 'Violation 2' },
      createdDate: '2026-07-03T10:00:00.000Z',
      firstDetected: '2026-07-03T10:00:00.000Z',
      lastDetected: '2026-07-03T10:20:00.000Z', // 20 mins resolution
    },
    {
      id: 'f_3',
      rule: 'VAL-HYG-001',
      ruleVersion: '1.0.0',
      engineVersion: '1.0.0',
      domain: 'Platform Team',
      owner: 'Platform Team',
      package: 'core',
      feature: 'formatting',
      status: 'REGRESSION',
      confidence: 0.9,
      relationships: [],
      evidence: { path: 'styles.css', message: 'Violation 2 regression' },
      createdDate: '2026-07-03T10:30:00.000Z',
      firstDetected: '2026-07-03T10:30:00.000Z',
      lastDetected: '2026-07-03T10:30:00.000Z',
    },
  ];

  const mockHistoryProvider: HistoryProvider = {
    getHistory: (id: string) => {
      if (id === 'f_1') {
        return [
          { timestamp: '2026-07-03T10:00:00.000Z', action: 'CREATED', status: 'NEW' },
          { timestamp: '2026-07-03T10:10:00.000Z', action: 'FIX_VERIFIED', status: 'CLOSED' },
        ];
      }
      if (id === 'f_2') {
        return [
          { timestamp: '2026-07-03T10:00:00.000Z', action: 'CREATED', status: 'NEW' },
          { timestamp: '2026-07-03T10:20:00.000Z', action: 'RESOLVED', status: 'CLOSED' }, // Manual resolution
        ];
      }
      return [];
    },
  };

  const mockSessionProvider: SessionProvider = {
    list: () => [
      {
        sessionId: 'session-2',
        executionMode: 'STANDARD',
        startedAt: '2026-07-03T11:00:00.000Z',
        finishedAt: '2026-07-03T11:05:00.000Z',
        status: 'COMPLETED',
        closedFindings: ['f_1'],
        reopenedFindings: [],
        modifiedFiles: ['auth.ts'],
      },
      {
        sessionId: 'session-1',
        executionMode: 'INTERACTIVE',
        startedAt: '2026-07-03T10:00:00.000Z',
        finishedAt: '2026-07-03T10:05:00.000Z',
        status: 'INTERRUPTED',
        closedFindings: [],
        reopenedFindings: ['f_3'],
        modifiedFiles: ['styles.css'],
      },
    ],
  };

  const mockRollbackProvider: RollbackProvider = {
    list: () => [
      { id: 'backup-1', timestamp: '2026-07-03T10:05:00.000Z', files: {}, restored: true },
    ],
  };

  const mockFixRegistryProvider: FixRegistryProvider = {
    supports: (ruleId: string) => ruleId === 'VAL-HYG-001',
  };

  const mockTrendProvider = {
    getTrends: () => [
      {
        timestamp: '2026-07-02T12:00:00.000Z',
        totalFindings: 10,
        closedFindings: 5,
        scores: { overall: 85 },
      },
      {
        timestamp: '2026-07-03T12:00:00.000Z',
        totalFindings: 12,
        closedFindings: 7,
        scores: { overall: 90 },
      },
    ],
  };

  it('correctly compiles overall repository analytics and KPIs', () => {
    const timestamp = '2026-07-03T12:00:00.000Z';
    const result = AnalyticsEngine.compile(
      dummyFindings,
      dummyMetrics,
      mockSessionProvider,
      mockRollbackProvider,
      mockHistoryProvider,
      mockFixRegistryProvider,
      mockTrendProvider,
      timestamp
    );

    expect(result.repository.schemaVersion).toBe(1);
    expect(result.repository.generatedAt).toBe(timestamp);
    expect(result.repository.overallScore).toBe(92);
    expect(result.repository.categoryScores.security).toBe(100);
    expect(result.repository.findings.total).toBe(3);
    expect(result.repository.findings.active).toBe(1); // f_3 regression
    expect(result.repository.findings.closed).toBe(2); // f_1, f_2
    expect(result.repository.findings.regressions).toBe(1);
    expect(result.repository.findings.falsePositives).toBe(0);

    // KPI verification
    expect(result.repository.kpis.averageResolutionTimeMs).toBe(120000);
    expect(result.repository.kpis.averageConfidence).toBe(0.95);
    // 2 closed findings, f_1 closed via FIX_VERIFIED (auto-fix), f_2 via RESOLVED (manual). Fix coverage is 1/2 = 0.5.
    expect(result.repository.kpis.autoFixCoverage).toBe(0.5);
    // 1 regression, 2 closed. Regression rate is 1/2 = 0.5.
    expect(result.repository.kpis.regressionRate).toBe(0.5);
  });

  it('aggregates rules alphabetically and calculates correct fix coverage per rule', () => {
    const result = AnalyticsEngine.compile(
      dummyFindings,
      dummyMetrics,
      mockSessionProvider,
      mockRollbackProvider,
      mockHistoryProvider,
      mockFixRegistryProvider,
      mockTrendProvider,
      '2026-07-03T12:00:00.000Z'
    );

    expect(result.rules.length).toBeGreaterThanOrEqual(2);
    // Verify sorted alphabetically
    const sortedIds = result.rules.map(r => r.ruleId);
    const expectedSortedIds = [...sortedIds].sort((a, b) => a.localeCompare(b));
    expect(sortedIds).toEqual(expectedSortedIds);

    const hygRule = result.rules.find(r => r.ruleId === 'VAL-HYG-001')!;
    expect(hygRule).toBeDefined();
    expect(hygRule.activeCount).toBe(1); // f_3 regression
    expect(hygRule.resolvedCount).toBe(1); // f_2 closed
    expect(hygRule.fixable).toBe(true);
    expect(hygRule.fixCoverage).toBe(0); // f_2 was manually resolved
    expect(hygRule.avgResolutionTimeMs).toBe(1200000); // 20 mins in ms

    const secRule = result.rules.find(r => r.ruleId === 'VAL-SEC-001')!;
    expect(secRule).toBeDefined();
    expect(secRule.activeCount).toBe(0);
    expect(secRule.resolvedCount).toBe(1); // f_1 closed
    expect(secRule.fixable).toBe(false);
    expect(secRule.fixCoverage).toBe(1.0); // f_1 was auto-closed
    expect(secRule.avgResolutionTimeMs).toBe(600000); // 10 mins in ms
  });

  it('aggregates and sorts sessions chronologically (newest first)', () => {
    const result = AnalyticsEngine.compile(
      dummyFindings,
      dummyMetrics,
      mockSessionProvider,
      mockRollbackProvider,
      mockHistoryProvider,
      mockFixRegistryProvider,
      mockTrendProvider,
      '2026-07-03T12:00:00.000Z'
    );

    expect(result.sessions.length).toBe(2);
    expect(result.sessions[0].sessionId).toBe('session-2'); // started at 11:00
    expect(result.sessions[0].totalApplied).toBe(1);
    expect(result.sessions[0].status).toBe('COMPLETED');

    expect(result.sessions[1].sessionId).toBe('session-1'); // started at 10:00
    expect(result.sessions[1].totalApplied).toBe(0);
    expect(result.sessions[1].status).toBe('INTERRUPTED');
  });

  it('compiles auto-fix and rollback statistics correctly', () => {
    const result = AnalyticsEngine.compile(
      dummyFindings,
      dummyMetrics,
      mockSessionProvider,
      mockRollbackProvider,
      mockHistoryProvider,
      mockFixRegistryProvider,
      mockTrendProvider,
      '2026-07-03T12:00:00.000Z'
    );

    // Total closed across sessions = 1 (session-2), total failed = 1 (session-1)
    expect(result.fixes.totalApplied).toBe(2);
    expect(result.fixes.totalSucceeded).toBe(1);
    expect(result.fixes.totalFailed).toBe(1);
    expect(result.fixes.totalRolledBack).toBe(1);
    expect(result.fixes.successRate).toBe(0.5); // 1 succeeded / 2 applied
    expect(result.fixes.rollbackRate).toBe(0.5); // 1 rollback / 2 applied
  });

  it('sorts trends chronologically', () => {
    const result = AnalyticsEngine.compile(
      dummyFindings,
      dummyMetrics,
      mockSessionProvider,
      mockRollbackProvider,
      mockHistoryProvider,
      mockFixRegistryProvider,
      mockTrendProvider,
      '2026-07-03T12:00:00.000Z'
    );

    expect(result.trends.length).toBe(2);
    expect(result.trends[0].timestamp).toBe('2026-07-02T12:00:00.000Z');
    expect(result.trends[1].timestamp).toBe('2026-07-03T12:00:00.000Z');
  });
});
