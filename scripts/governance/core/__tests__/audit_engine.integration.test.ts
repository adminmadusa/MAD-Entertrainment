import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { AuditEngine } from '../audit_engine';
import { FindingManager } from '../finding_manager';
import { ReportEngine } from '../report_engine';
import { MetricsEngine } from '../metrics_engine';
import { RuleRegistry } from '../../rules/registry';
import { StatelessViolation } from '../types';

const sandboxRoot = resolve(__dirname, '../../../../scratch/test-audit-engine');

describe('AuditEngine (Orchestrator Integration Flow)', () => {
  beforeAll(() => {
    if (!existsSync(sandboxRoot)) {
      mkdirSync(sandboxRoot, { recursive: true });
    }

    // Redirect FindingManager database directories to sandbox
    (FindingManager as any).govDir = sandboxRoot;
    (FindingManager as any).findingsDir = join(sandboxRoot, 'findings');
    (FindingManager as any).activeDir = join(sandboxRoot, 'findings/active');
    (FindingManager as any).closedDir = join(sandboxRoot, 'findings/closed');
    (FindingManager as any).suppressedDir = join(sandboxRoot, 'findings/suppressed');
    (FindingManager as any).archiveFindingsDir = join(sandboxRoot, 'archive/findings');
    (FindingManager as any).archiveHistoryDir = join(sandboxRoot, 'archive/history');
    (FindingManager as any).exceptionsDir = join(sandboxRoot, 'exceptions');
    (FindingManager as any).historyDir = join(sandboxRoot, 'history');
    (FindingManager as any).baselinesDir = join(sandboxRoot, 'baselines');
    (FindingManager as any).metricsDir = join(sandboxRoot, 'metrics');

    // Redirect ReportEngine reports output directory to sandbox
    (ReportEngine as any).reportsDir = join(sandboxRoot, 'reports');

    // No-op for snapshot & metrics trend persistence to keep sandbox clean
    vi.spyOn(AuditEngine.prototype as any, 'saveSnapshot').mockImplementation(() => {});
    vi.spyOn(MetricsEngine as any, 'saveTrendMetrics').mockImplementation(() => {});

    // Spy on RuleRegistry
    vi.spyOn(RuleRegistry, 'getRule').mockImplementation((id: string) => {
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
      if (id === 'VAL-SEC-001') {
        return {
          id: 'VAL-SEC-001',
          name: 'Security check',
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
      return undefined;
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
    if (existsSync(sandboxRoot)) {
      rmSync(sandboxRoot, { recursive: true, force: true });
    }
  });

  it('should execute orchestrator pipeline and verify gating actions and reports generation', () => {
    const audit = new AuditEngine();

    const rawViolations: StatelessViolation[] = [
      {
        rule: 'VAL-UI-001',
        path: 'apps/web/src/components/Button.tsx',
        construct: 'button',
        line: 10,
        snippet: '<button>',
        message: 'Raw HTML button used',
        confidence: 1.0,
      },
    ];

    const result = audit.execute(rawViolations);

    // 1. Verify success gating
    expect(result.success).toBe(true); // Gating action is WARN, success is true
    expect(result.gatingAction).toBe('WARN');
    expect(result.findings.length).toBe(1);

    const firstFinding = result.findings[0];
    expect(firstFinding.status).toBe('NEW');

    // 2. Verify that findings got saved to sandbox database
    const savedFindingPath = join((FindingManager as any).activeDir, `${firstFinding.id}.json`);
    expect(existsSync(savedFindingPath)).toBe(true);

    // 3. Verify reports got written to sandbox reports directory
    const govReportPath = join((ReportEngine as any).reportsDir, 'governance-report.md');
    expect(existsSync(govReportPath)).toBe(true);

    const regressionReportPath = join((ReportEngine as any).reportsDir, 'regression-report.md');
    expect(existsSync(regressionReportPath)).toBe(true);
  });

  it('should fail gating evaluation when a FAIL_BUILD policy violation is evaluated', () => {
    const audit = new AuditEngine();

    const rawViolations: StatelessViolation[] = [
      {
        rule: 'VAL-SEC-001',
        path: 'apps/server/src/keys.ts',
        construct: 'key',
        line: 1,
        snippet: 'API_KEY="123"',
        message: 'Secret detected',
        confidence: 1.0,
      },
    ];

    const result = audit.execute(rawViolations);

    expect(result.success).toBe(false); // Gating policy FAIL_BUILD resolves success to false
    expect(result.gatingAction).toBe('FAIL_BUILD');
  });
});
