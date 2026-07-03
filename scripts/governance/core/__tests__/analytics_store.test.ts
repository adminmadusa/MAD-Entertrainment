// scripts/governance/core/__tests__/analytics_store.test.ts
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import { beforeEach, describe, expect, it } from 'vitest';

import { AnalyticsStore } from '../analytics_store';
import type { AnalyticsResult } from '../analytics_types';

const workspaceRoot = resolve(__dirname, '../../../../..');
const sandboxAnalyticsDir = resolve(workspaceRoot, '.governance/analytics');

describe('AnalyticsStore', () => {
  const dummyResult: AnalyticsResult = {
    repository: {
      schemaVersion: 1,
      generatedAt: '2026-07-03T12:00:00.000Z',
      overallScore: 92,
      categoryScores: {
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
      findings: {
        total: 10,
        active: 3,
        closed: 7,
        regressions: 0,
        falsePositives: 0,
      },
      kpis: {
        averageResolutionTimeMs: 100000,
        averageConfidence: 0.95,
        autoFixCoverage: 0.5,
        regressionRate: 0,
      },
    },
    trends: [
      {
        timestamp: '2026-07-02T12:00:00.000Z',
        overallScore: 90,
        totalFindings: 8,
        activeFindings: 2,
        closedFindings: 6,
      },
    ],
    rules: [
      {
        ruleId: 'VAL-HYG-001',
        ruleName: 'Hygiene Rule',
        category: 'HYGIENE',
        severity: 'WARNING',
        activeCount: 1,
        resolvedCount: 5,
        regressionCount: 0,
        fixable: true,
        fixCoverage: 0.8,
        avgResolutionTimeMs: 50000,
      },
    ],
    fixes: {
      totalApplied: 4,
      totalSucceeded: 3,
      totalFailed: 1,
      totalRolledBack: 0,
      successRate: 0.75,
      rollbackRate: 0,
    },
    sessions: [
      {
        sessionId: 'session-123',
        mode: 'STANDARD',
        startedAt: '2026-07-03T11:00:00.000Z',
        finishedAt: '2026-07-03T11:05:00.000Z',
        status: 'COMPLETED',
        totalApplied: 3,
        totalSkipped: 0,
      },
    ],
  };

  beforeEach(() => {
    if (existsSync(sandboxAnalyticsDir)) {
      rmSync(sandboxAnalyticsDir, { recursive: true, force: true });
    }
    mkdirSync(sandboxAnalyticsDir, { recursive: true });
  });

  it('correctly persists analytics files under .governance/analytics/', () => {
    const generatedAt = '2026-07-03T12:00:00.000Z';
    const res = AnalyticsStore.write(dummyResult, generatedAt, workspaceRoot);

    expect(res.writtenCount).toBe(5);
    expect(res.skippedCount).toBe(0);

    // Verify files presence
    const files = ['repository.json', 'rules.json', 'fixes.json', 'sessions.json', 'trends.json'];
    for (const file of files) {
      expect(existsSync(resolve(sandboxAnalyticsDir, file))).toBe(true);
    }

    // Read repository.json and assert deterministic keys (e.g. sorted keys)
    const content = readFileSync(resolve(sandboxAnalyticsDir, 'repository.json'), 'utf8');
    const parsed = JSON.parse(content);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.generatedAt).toBe(generatedAt);
    expect(parsed.overallScore).toBe(92);

    // Assert that the raw file keys are sorted alphabetically (checked by serializing matching structure)
    const keys = Object.keys(parsed);
    const sortedKeys = [...keys].sort();
    expect(keys).toEqual(sortedKeys);
  });

  it('satisfies idempotency (zero writes on identical consecutive calls)', () => {
    const generatedAt = '2026-07-03T12:00:00.000Z';
    const firstRun = AnalyticsStore.write(dummyResult, generatedAt, workspaceRoot);
    expect(firstRun.writtenCount).toBe(5);
    expect(firstRun.skippedCount).toBe(0);

    const secondRun = AnalyticsStore.write(dummyResult, generatedAt, workspaceRoot);
    expect(secondRun.writtenCount).toBe(0);
    expect(secondRun.skippedCount).toBe(5); // Skipped all because files didn't change
  });
});
