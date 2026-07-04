import { describe, it, expect, vi } from 'vitest';
import { LifecycleManager } from '../lifecycle_manager';
import { FindingManager } from '../finding_manager';
import { Finding, FindingException } from '../types';

describe('LifecycleManager (Status Reconciliation State Machine)', () => {
  const createMockFinding = (id: string, status: any): Finding => ({
    id,
    rule: 'VAL-UI-001',
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

  const setupMockFindingManager = (findings: Finding[], exceptions: Record<string, FindingException> = {}) => {
    const mockFM = {
      getAllFindings: vi.fn().mockReturnValue(findings),
      getException: vi.fn().mockImplementation((id: string) => exceptions[id]),
      saveFinding: vi.fn(),
      logHistoryEvent: vi.fn(),
    } as unknown as FindingManager;

    return { mockFM, lifecycle: new LifecycleManager(mockFM) };
  };

  it('should transition active findings to CLOSED when they are no longer detected', () => {
    const activeStatuses = ['NEW', 'CONFIRMED', 'REGRESSION'] as const;

    for (const status of activeStatuses) {
      const finding = createMockFinding('TEST-001', status);
      const { mockFM, lifecycle } = setupMockFindingManager([finding]);

      // Reconcile with an empty set of detected findings (the violation is fixed/not detected)
      lifecycle.reconcile(new Set());

      expect(finding.status).toBe('CLOSED');
      expect(mockFM.saveFinding).toHaveBeenCalledWith(finding);
      expect(mockFM.logHistoryEvent).toHaveBeenCalledWith('TEST-001', expect.objectContaining({
        action: 'RESOLVED',
        status: 'CLOSED',
      }));
    }
  });

  it('should transition CLOSED or VERIFIED findings to REGRESSION if they are detected again', () => {
    const resolvedStatuses = ['CLOSED', 'VERIFIED'] as const;

    for (const status of resolvedStatuses) {
      const finding = createMockFinding('TEST-002', status);
      const { mockFM, lifecycle } = setupMockFindingManager([finding]);

      // Reconcile with the finding ID in the detected set (violation has reappeared)
      lifecycle.reconcile(new Set(['TEST-002']));

      expect(finding.status).toBe('REGRESSION');
      expect(mockFM.saveFinding).toHaveBeenCalledWith(finding);
      expect(mockFM.logHistoryEvent).toHaveBeenCalledWith('TEST-002', expect.objectContaining({
        action: 'DETECTED_AGAIN',
        status: 'REGRESSION',
      }));
    }
  });

  it('should transition FALSE_POSITIVE or IGNORED findings back to NEW if their exception is missing or has expired', () => {
    const bypassedStatuses = ['FALSE_POSITIVE', 'IGNORED'] as const;

    for (const status of bypassedStatuses) {
      const finding = createMockFinding('TEST-003', status);
      // Setup with no exceptions registered
      const { mockFM, lifecycle } = setupMockFindingManager([finding], {});

      // Reconcile with the finding still detected
      lifecycle.reconcile(new Set(['TEST-003']));

      expect(finding.status).toBe('NEW');
      expect(mockFM.saveFinding).toHaveBeenCalledWith(finding);
      expect(mockFM.logHistoryEvent).toHaveBeenCalledWith('TEST-003', expect.objectContaining({
        action: 'EXCEPTION_EXPIRED',
        status: 'NEW',
      }));
    }
  });

  it('should preserve FALSE_POSITIVE or IGNORED status if a valid non-expired exception exists', () => {
    const bypassedStatuses = ['FALSE_POSITIVE', 'IGNORED'] as const;

    for (const status of bypassedStatuses) {
      const finding = createMockFinding('TEST-004', status);
      const exception: FindingException = {
        id: 'TEST-004',
        justification: 'Valid exception',
        expiration: '2027-01-01',
        approver: 'Security Lead',
      };

      const { mockFM, lifecycle } = setupMockFindingManager([finding], { 'TEST-004': exception });

      lifecycle.reconcile(new Set(['TEST-004']));

      expect(finding.status).toBe(status); // Status is untouched
      expect(mockFM.saveFinding).not.toHaveBeenCalled();
    }
  });

  it('should verify that human overrides (INTENTIONAL, DOCUMENTED, IMPLEMENTED) are not altered during reconciliation', () => {
    // This test documents current repository behavior. It is not a statement of intended governance semantics.
    const overrideStatuses = ['INTENTIONAL', 'DOCUMENTED', 'IMPLEMENTED'] as const;

    for (const status of overrideStatuses) {
      // Scenario A: Finding is detected again
      const findingA = createMockFinding('TEST-005', status);
      const { mockFM: mockFMA, lifecycle: lifecycleA } = setupMockFindingManager([findingA]);
      lifecycleA.reconcile(new Set(['TEST-005']));
      expect(findingA.status).toBe(status);
      expect(mockFMA.saveFinding).not.toHaveBeenCalled();

      // Scenario B: Finding is no longer detected
      const findingB = createMockFinding('TEST-006', status);
      const { mockFM: mockFMB, lifecycle: lifecycleB } = setupMockFindingManager([findingB]);
      lifecycleB.reconcile(new Set());
      expect(findingB.status).toBe(status);
      expect(mockFMB.saveFinding).not.toHaveBeenCalled();
    }
  });
});
