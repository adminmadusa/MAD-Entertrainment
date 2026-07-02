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
    (FindingManager as any).exceptionsDir = join(scratchRoot, 'exceptions');
    (FindingManager as any).historyDir = join(scratchRoot, 'history');
    (FindingManager as any).baselinesDir = join(scratchRoot, 'baselines');
    (FindingManager as any).metricsDir = join(scratchRoot, 'metrics');

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

    expect(finding.id).toBeDefined();
    expect(finding.id.startsWith('UI-100-')).toBe(true);
    expect(finding.status).toBe('NEW');
    expect(finding.evidence.path).toBe(violation.path);

    // Verify finding is saved to disk
    const savedPath = join((FindingManager as any).findingsDir, `${finding.id}.json`);
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
    const oldPath = originalFinding.evidence.path;
    const newPath = 'apps/web/src/components/CoolButton.tsx';

    // Mock RenameDetector behavior
    vi.spyOn(RenameDetector, 'wasRenamedFrom').mockImplementation((current, old) => {
      return current === newPath && old === oldPath;
    });

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
});
