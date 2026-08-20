// scripts/governance/core/__tests__/analytics_store.test.ts
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { AnalyticsStore } from '../analytics_store';
import type { AnalyticsResult } from '../analytics_types';

// Isolate test sandbox directory under the current test folder
const testSandboxRoot = resolve(__dirname, 'temp_sandbox');
const testAnalyticsDir = join(testSandboxRoot, '.governance/analytics');

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
    if (existsSync(testSandboxRoot)) {
      rmSync(testSandboxRoot, { recursive: true, force: true });
    }
    mkdirSync(testSandboxRoot, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testSandboxRoot)) {
      rmSync(testSandboxRoot, { recursive: true, force: true });
    }
  });

  it('correctly persists analytics files under test_sandbox/.governance/analytics/ with data wrapping', () => {
    const generatedAt = '2026-07-03T12:00:00.000Z';
    const res = AnalyticsStore.write(dummyResult, generatedAt, testSandboxRoot);

    expect(res.writtenCount).toBe(5);
    expect(res.skippedCount).toBe(0);

    const files = [
      { name: 'repository.json', type: 'object' },
      { name: 'rules.json', type: 'array' },
      { name: 'fixes.json', type: 'object' },
      { name: 'sessions.json', type: 'array' },
      { name: 'trends.json', type: 'array' },
    ];

    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

    for (const file of files) {
      const filePath = join(testAnalyticsDir, file.name);
      expect(existsSync(filePath)).toBe(true);

      const content = readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);

      // Verify standardized envelope metadata
      expect(Number.isInteger(parsed.schemaVersion)).toBe(true);
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.generatedAt).toMatch(iso8601Regex);
      expect(parsed.generatedAt).toBe(generatedAt);

      // Verify nested payload and data types
      expect(parsed.data).toBeDefined();
      if (file.type === 'array') {
        expect(Array.isArray(parsed.data)).toBe(true);
      } else {
        expect(typeof parsed.data).toBe('object');
        expect(parsed.data).not.toBeNull();
        expect(Array.isArray(parsed.data)).toBe(false);
      }

      // Assert that the raw file keys are sorted alphabetically
      const keys = Object.keys(parsed);
      const sortedKeys = [...keys].sort();
      expect(keys).toEqual(sortedKeys);
    }
  });

  it('satisfies idempotency (zero writes on identical consecutive calls, preserving generatedAt)', () => {
    const firstGeneratedAt = '2026-07-03T12:00:00.000Z';
    const secondGeneratedAt = '2026-07-03T13:00:00.000Z'; // Different timestamp

    // 1. Run once
    const firstRun = AnalyticsStore.write(dummyResult, firstGeneratedAt, testSandboxRoot);
    expect(firstRun.writtenCount).toBe(5);
    expect(firstRun.skippedCount).toBe(0);

    // Capture the exact file contents after the first run
    const files = ['repository.json', 'rules.json', 'fixes.json', 'sessions.json', 'trends.json'];
    const firstRunContents: Record<string, string> = {};
    for (const file of files) {
      firstRunContents[file] = readFileSync(join(testAnalyticsDir, file), 'utf8');
    }

    // 2. Run again with identical input data but a new generatedAt timestamp
    const secondRun = AnalyticsStore.write(dummyResult, secondGeneratedAt, testSandboxRoot);
    expect(secondRun.writtenCount).toBe(0);
    expect(secondRun.skippedCount).toBe(5); // All 5 should be skipped (idempotent)

    // 3. Verify that the file contents and the generatedAt timestamp did not change
    for (const file of files) {
      const currentContent = readFileSync(join(testAnalyticsDir, file), 'utf8');
      expect(currentContent).toBe(firstRunContents[file]);

      const parsed = JSON.parse(currentContent);
      expect(parsed.generatedAt).toBe(firstGeneratedAt); // Preserved the original timestamp
    }
  });
});
