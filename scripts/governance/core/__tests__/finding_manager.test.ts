import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { FindingManager } from '../finding_manager';
import { RuleRegistry } from '../../rules/registry';
import { RenameDetector } from '../rename_detector';
import { Finding, FindingException, StatelessViolation } from '../types';

const scratchRoot = resolve(__dirname, '../../../../scratch/test-finding-manager');

describe('FindingManager (State Persistence & Serialization)', () => {
  let fm: FindingManager;

  beforeAll(() => {
    // Isolate database files in test environment
    if (!existsSync(scratchRoot)) {
      mkdirSync(scratchRoot, { recursive: true });
    }

    // Override FindingManager's static directories to sandbox tests
    (FindingManager as any).govDir = scratchRoot;
    (FindingManager as any).findingsDir = join(scratchRoot, 'findings');
    (FindingManager as any).activeDir = join(scratchRoot, 'findings/active');
    (FindingManager as any).closedDir = join(scratchRoot, 'findings/closed');
    (FindingManager as any).suppressedDir = join(scratchRoot, 'findings/suppressed');
    (FindingManager as any).archiveFindingsDir = join(scratchRoot, 'archive/findings');
    (FindingManager as any).archiveHistoryDir = join(scratchRoot, 'archive/history');
    (FindingManager as any).exceptionsDir = join(scratchRoot, 'exceptions');
    (FindingManager as any).historyDir = join(scratchRoot, 'history');
    (FindingManager as any).baselinesDir = join(scratchRoot, 'baselines');
    (FindingManager as any).metricsDir = join(scratchRoot, 'metrics');

    // Spy on RenameDetector early so it binds before finding_manager uses it
    vi.spyOn(RenameDetector, 'wasRenamedFrom').mockImplementation((current, old) => {
      const newPath = 'apps/web/src/components/CoolButton.tsx';
      const oldPath = 'apps/web/src/components/Button.tsx';
      return current === newPath && old === oldPath;
    });

    // Spy on RuleRegistry to ensure rules are resolved deterministically
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
      return undefined;
    });

    fm = new FindingManager();
  });

  afterAll(() => {
    vi.restoreAllMocks();
    if (existsSync(scratchRoot)) {
      rmSync(scratchRoot, { recursive: true, force: true });
    }
  });

  it('should initialize and create the governance database folder structure', () => {
    expect(existsSync((FindingManager as any).govDir)).toBe(true);
    expect(existsSync((FindingManager as any).findingsDir)).toBe(true);
    expect(existsSync((FindingManager as any).exceptionsDir)).toBe(true);
    expect(existsSync((FindingManager as any).historyDir)).toBe(true);
  });

  it('should create a new finding when no matching finding exists on disk', () => {
    const violation: StatelessViolation = {
      rule: 'VAL-UI-001',
      path: 'apps/web/src/components/Button.tsx',
      construct: 'button',
      line: 12,
      snippet: '<button>',
      message: 'Raw HTML button',
      confidence: 1.0,
    };

    const finding = fm.matchOrCreateFinding(violation);
    fm.finalizeFinding(finding.id);

    expect(finding.id).toBeDefined();
    expect(finding.id.startsWith('f_')).toBe(true);
    expect(finding.status).toBe('NEW');
    expect(finding.evidence.path).toBe(violation.path);

    // Verify finding is saved to disk
    const savedPath = join((FindingManager as any).activeDir, `${finding.id}.json`);
    expect(existsSync(savedPath)).toBe(true);

    const savedContent = JSON.parse(readFileSync(savedPath, 'utf8')) as Finding;
    expect(savedContent.id).toBe(finding.id);
  });

  it('should deduplicate and match an existing finding precisely if rule, path, and construct match', () => {
    const violation: StatelessViolation = {
      rule: 'VAL-UI-001',
      path: 'apps/web/src/components/Button.tsx',
      construct: 'button',
      line: 15, // line changed
      snippet: '<button class="new">',
      message: 'Updated Raw HTML button',
      confidence: 1.0,
    };

    const originalFindingsCount = fm.getAllFindings().length;
    const matchedFinding = fm.matchOrCreateFinding(violation);

    // No new finding should be created
    expect(fm.getAllFindings().length).toBe(originalFindingsCount);
    // Path should remain the same, message and lines should update in-memory
    expect(matchedFinding.evidence.line).toBe(15);
    expect(matchedFinding.evidence.message).toBe(violation.message);
  });

  it('should support rename matching when RenameDetector registers a file rename', () => {
    const originalFinding = fm.getAllFindings()[0];
    const newPath = 'apps/web/src/components/CoolButton.tsx';

    const violation: StatelessViolation = {
      rule: 'VAL-UI-001',
      path: newPath,
      construct: originalFinding.evidence.construct,
      line: 10,
      snippet: '<button>',
      message: 'Raw HTML button in renamed file',
      confidence: 1.0,
    };

    const matchedFinding = fm.matchOrCreateFinding(violation);
    fm.finalizeFinding(matchedFinding.id);

    expect(matchedFinding.id).toBe(originalFinding.id);
    expect(matchedFinding.evidence.path).toBe(newPath);

    // Verify rename log appended to history file on disk
    const historyPath = join((FindingManager as any).historyDir, `${matchedFinding.id}.json`);
    const historyRecord = JSON.parse(readFileSync(historyPath, 'utf8'));
    expect(historyRecord.history.some((h: any) => h.action === 'RENAMED')).toBe(true);

    vi.restoreAllMocks();
  });

  it('should correctly filter out expired exceptions and load valid ones', () => {
    const validException: FindingException = {
      id: 'UI-100-001',
      justification: 'Valid bypass exception',
      expiration: '2028-12-31',
      approver: 'Security Architect',
    };

    const expiredException: FindingException = {
      id: 'UI-100-002',
      justification: 'Expired bypass exception',
      expiration: '2020-01-01',
      approver: 'Security Architect',
    };

    // Serialize exception files manually
    writeFileSync(join((FindingManager as any).exceptionsDir, 'UI-100-001.json'), JSON.stringify(validException, null, 2), 'utf8');
    writeFileSync(join((FindingManager as any).exceptionsDir, 'UI-100-002.json'), JSON.stringify(expiredException, null, 2), 'utf8');

    // Reload FindingManager database to trigger loadAll()
    const testFM = new FindingManager();

    expect(testFM.getException('UI-100-001')).toBeDefined();
    expect(testFM.getException('UI-100-002')).toBeUndefined(); // Expired exceptions are filtered
  });

  it('should handle corrupted JSON finding files gracefully without throwing errors during loadAll()', () => {
    // Write corrupted JSON finding file to disk
    const corruptedPath = join((FindingManager as any).findingsDir, 'CORRUPT-999.json');
    writeFileSync(corruptedPath, '{"id": "CORRUPT-999", "rule": "VAL-UI-001", broken: JSON}', 'utf8');

    expect(() => new FindingManager()).not.toThrow();
  });

  // ---
  // Occurrence Identity Regression Tests
  // These tests verify that the runtime deduplication matches the migration
  // semantics defined in scripts/governance/migrate-findings.ts:
  //   identity = fingerprint + line   (NOT fingerprint alone)
  // ---

  it('(occurrence-identity-1) should NOT create a second occurrence when fingerprint AND line are identical', () => {
    // Two violations: same rule, same path, same snippet, same line.
    // Result: one occurrence, occurrenceCount = 1.
    const violation: StatelessViolation = {
      rule: 'VAL-UI-001',
      path: 'apps/web/src/components/OccDedup.tsx',
      construct: 'button',
      line: 10,
      snippet: '<button>',
      message: 'Raw button',
      confidence: 1.0,
    };

    // First scan run
    const claimed1 = new Set<string>();
    const f1 = fm.matchOrCreateFinding(violation, claimed1);
    claimed1.add(f1.id);
    fm.finalizeFinding(f1.id);

    // Second scan run — identical violation, same line
    const claimed2 = new Set<string>();
    const f2 = fm.matchOrCreateFinding(violation, claimed2);
    claimed2.add(f2.id);
    fm.finalizeFinding(f2.id);

    expect(f2.id).toBe(f1.id);
    expect(f2.evidence.occurrences?.length).toBe(1);
    expect(f2.occurrenceCount).toBe(1);
  });

  it('(occurrence-identity-2) should create TWO occurrences when fingerprint is identical but lines differ', () => {
    // Two violations: same rule, same path, same snippet — different lines.
    // Identity = fingerprint + line, so both must be preserved.
    // occurrenceCount must equal 2.
    const violationA: StatelessViolation = {
      rule: 'VAL-UI-001',
      path: 'apps/web/src/components/OccMultiLine.tsx',
      construct: 'button',
      line: 10,
      snippet: '<button>',
      message: 'Raw button',
      confidence: 1.0,
    };
    const violationB: StatelessViolation = {
      ...violationA,
      line: 40,   // different source location, same normalized snippet
    };

    const claimed = new Set<string>();

    // First violation — creates the finding
    const finding = fm.matchOrCreateFinding(violationA, claimed);
    claimed.add(finding.id);

    // Second violation — must be added as a SEPARATE occurrence (different line)
    fm.matchOrCreateFinding(violationB, claimed);

    fm.finalizeFinding(finding.id);

    expect(finding.evidence.occurrences?.length).toBe(2);
    expect(finding.occurrenceCount).toBe(2);

    const lines = (finding.evidence.occurrences ?? [])
      .map(o => o.line)
      .sort((a, b) => a - b);
    expect(lines).toEqual([10, 40]);
  });

  it('(occurrence-identity-3) should not lose occurrences when the engine re-runs over a persisted multi-occurrence finding', () => {
    // Simulates a finding with two same-fingerprint occurrences already on disk
    // (produced by the migration script). After a re-run the count must be unchanged.
    const sharedPath = 'apps/web/src/components/OccPersist.tsx';
    const violationA: StatelessViolation = {
      rule: 'VAL-UI-001',
      path: sharedPath,
      construct: 'button',
      line: 50,
      snippet: '<button>',
      message: 'Raw button',
      confidence: 1.0,
    };
    const violationB: StatelessViolation = { ...violationA, line: 90 };

    // Run 1 — establish baseline with two occurrences on disk
    const claimed1 = new Set<string>();
    const f1 = fm.matchOrCreateFinding(violationA, claimed1);
    claimed1.add(f1.id);
    fm.matchOrCreateFinding(violationB, claimed1);
    fm.finalizeFinding(f1.id);

    const countAfterRun1 = f1.evidence.occurrences?.length ?? 0;

    // Run 2 — engine re-processes the same violations
    const claimed2 = new Set<string>();
    const f2 = fm.matchOrCreateFinding(violationA, claimed2);
    claimed2.add(f2.id);
    fm.matchOrCreateFinding(violationB, claimed2);
    fm.finalizeFinding(f2.id);

    const countAfterRun2 = f2.evidence.occurrences?.length ?? 0;

    // No occurrences must be lost between runs
    expect(f2.id).toBe(f1.id);
    expect(countAfterRun2).toBe(countAfterRun1);
    expect(countAfterRun2).toBe(2);
  });

  it('should save closed findings in partitioned month folders and load them recursively', () => {
    const violation: StatelessViolation = {
      rule: 'VAL-UI-001',
      path: 'apps/web/src/components/ClosedTest.tsx',
      construct: 'button',
      line: 12,
      snippet: '<button>',
      message: 'Raw HTML button',
      confidence: 1.0,
    };

    const finding = fm.matchOrCreateFinding(violation);
    finding.status = 'CLOSED';
    finding.lastModified = '2026-07-03T12:00:00Z';
    fm.saveFinding(finding);

    // Verify it is saved in a YYYY-MM subfolder
    const expectedSubfolder = join((FindingManager as any).closedDir, '2026-07');
    const expectedPath = join(expectedSubfolder, `${finding.id}.json`);
    expect(existsSync(expectedPath)).toBe(true);

    // Create a new FindingManager instance to test recursive loadAll
    const fm2 = new FindingManager();
    const loaded = (fm2 as any).findings.get(finding.id);
    expect(loaded).toBeDefined();
    expect(loaded.status).toBe('CLOSED');
  });
});
