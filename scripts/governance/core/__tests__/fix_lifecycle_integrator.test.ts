import { describe, it, expect, vi, beforeEach } from 'vitest';

import { FixContext } from '../fix_context';
import { FixLifecycleIntegrator } from '../fix_lifecycle_integrator';
import { FixResult } from '../fix_result';
import { FindingManager } from '../finding_manager';
import { LifecycleManager } from '../lifecycle_manager';
import { VerificationRunner } from '../verification_runner';
import type { Finding } from '../types';

vi.mock('../verification_runner', () => {
  return {
    VerificationRunner: {
      run: vi.fn(),
    },
  };
});

describe('LifecycleManager & FixLifecycleIntegrator Integration', () => {
  let mockFM: FindingManager;
  let lifecycleManager: LifecycleManager;
  let findings: Finding[];

  const createMockFinding = (id: string, rule: string, path: string, status: any): Finding => ({
    id,
    rule,
    ruleVersion: '1.0.0',
    engineVersion: '1.0.0',
    domain: 'Architecture',
    owner: 'Platform Team',
    package: 'web',
    feature: 'UI',
    status,
    confidence: 1.0,
    relationships: [],
    evidence: {
      path,
      message: 'Violation found',
    },
    createdDate: new Date().toISOString(),
    firstDetected: new Date().toISOString(),
    lastDetected: new Date().toISOString(),
  });

  beforeEach(() => {
    findings = [
      createMockFinding('f_1', 'VAL-HYG-004', 'src/file1.ts', 'NEW'),
      createMockFinding('f_2', 'VAL-HYG-005', 'src/file2.ts', 'CONFIRMED'),
      createMockFinding('f_3', 'VAL-HYG-006', 'src/file3.ts', 'CLOSED'),
    ];

    mockFM = {
      getAllFindings: vi.fn().mockReturnValue(findings),
      saveFinding: vi.fn(),
      logHistoryEvent: vi.fn(),
      generateStableId: vi.fn().mockImplementation((rule, path) => `f_${rule}_${path}`),
    } as unknown as FindingManager;

    lifecycleManager = new LifecycleManager(mockFM);
  });

  describe('LifecycleManager.transitionFinding', () => {
    it('should transition finding status and log history event', () => {
      const finding = findings[0];
      lifecycleManager.transitionFinding(finding, 'CLOSED', 'AUTO_CLOSED', 'Test note');
      expect(finding.status).toBe('CLOSED');
      expect(mockFM.saveFinding).toHaveBeenCalledWith(finding);
      expect(mockFM.logHistoryEvent).toHaveBeenCalledWith('f_1', expect.objectContaining({
        action: 'AUTO_CLOSED',
        status: 'CLOSED',
        notes: expect.stringContaining('Test note'),
      }));
    });
  });

  describe('LifecycleManager.reconcileTargeted', () => {
    it('should only process findings that match scannedFiles list', () => {
      // Re-scan only src/file1.ts, violation still present
      const stillPresent = new Set(['VAL-HYG-004:src/file1.ts']);
      const result = lifecycleManager.reconcileTargeted(stillPresent, ['src/file1.ts']);

      expect(result.confirmed).toContain('f_1');
      expect(result.closed).toHaveLength(0);
      expect(result.reopened).toHaveLength(0);

      // f_2 and f_3 are outside scannedFiles, so they remain unchanged
      expect(findings[1].status).toBe('CONFIRMED');
      expect(findings[2].status).toBe('CLOSED');
    });

    it('should transition scanned active findings to VERIFIED then CLOSED when violations are absent', () => {
      // Re-scan src/file1.ts and src/file2.ts, violations are resolved (absent from stillPresent)
      const stillPresent = new Set<string>();
      const result = lifecycleManager.reconcileTargeted(stillPresent, ['src/file1.ts', 'src/file2.ts']);

      expect(result.closed).toContain('f_1');
      expect(result.closed).toContain('f_2');
      expect(findings[0].status).toBe('CLOSED');
      expect(findings[1].status).toBe('CLOSED');

      // Check double-transition event logging
      expect(mockFM.logHistoryEvent).toHaveBeenCalledWith('f_1', expect.objectContaining({ action: 'FIX_VERIFIED' }));
      expect(mockFM.logHistoryEvent).toHaveBeenCalledWith('f_1', expect.objectContaining({ action: 'AUTO_CLOSED' }));
    });

    it('should reopen closed findings as REGRESSION if violation returns during scan', () => {
      // Re-scan src/file3.ts, violation has re-appeared (is in stillPresent)
      const stillPresent = new Set(['VAL-HYG-006:src/file3.ts']);
      const result = lifecycleManager.reconcileTargeted(stillPresent, ['src/file3.ts']);

      expect(result.reopened).toContain('f_3');
      expect(findings[2].status).toBe('REGRESSION');
      expect(mockFM.logHistoryEvent).toHaveBeenCalledWith('f_3', expect.objectContaining({
        action: 'ROLLBACK_REOPENED',
        status: 'REGRESSION',
      }));
    });
  });

  describe('FixLifecycleIntegrator.integrate', () => {
    it('should do nothing if no files were modified', async () => {
      const fixResult = new FixResult();
      const context = new FixContext({ workspaceRoot: '/root' });

      const verResult = await FixLifecycleIntegrator.integrate(fixResult, context, lifecycleManager);
      expect(verResult.verifiedFindings).toHaveLength(0);
      expect(verResult.verificationPassed).toBe(0);
    });

    it('should run verification on modified files and process findings', async () => {
      const fixResult = new FixResult();
      fixResult.addResult({
        ruleId: 'VAL-HYG-004',
        filePath: 'src/file1.ts',
        success: true,
        safety: 'SAFE',
        applied: true,
      });
      fixResult.addResult({
        ruleId: 'VAL-HYG-005',
        filePath: 'src/file2.ts',
        success: true,
        safety: 'SAFE',
        applied: true,
      });

      const context = new FixContext({ workspaceRoot: '/root' });

      // Mock VerificationRunner.run to say VAL-HYG-004 is absent (fixed) but VAL-HYG-005 is still present (failed)
      vi.spyOn(VerificationRunner, 'run').mockResolvedValue(new Set(['VAL-HYG-005:src/file2.ts']));

      const verResult = await FixLifecycleIntegrator.integrate(fixResult, context, lifecycleManager);

      expect(VerificationRunner.run).toHaveBeenCalledWith('/root', ['src/file1.ts', 'src/file2.ts'], ['VAL-HYG-004', 'VAL-HYG-005']);
      expect(verResult.verificationPassed).toBe(1); // file1.ts passed
      expect(verResult.verificationFailed).toBe(1); // file2.ts failed
      expect(verResult.findingsClosed).toBe(1); // f_1 closed
      expect(findings[0].status).toBe('CLOSED');
      expect(findings[1].status).toBe('CONFIRMED');
    });
  });

  describe('FixLifecycleIntegrator.verifyAndReopenFindings', () => {
    it('should run verification on restored files and only reopen findings where violations re-appeared', async () => {
      const restoredFiles = ['src/file3.ts'];
      const context = new FixContext({ workspaceRoot: '/root' });

      // Case A: Violation re-appeared after rollback
      vi.spyOn(VerificationRunner, 'run').mockResolvedValue(new Set(['VAL-HYG-006:src/file3.ts']));
      let verResult = await FixLifecycleIntegrator.verifyAndReopenFindings(restoredFiles, context, lifecycleManager);

      expect(verResult.findingsReopened).toBe(1);
      expect(findings[2].status).toBe('REGRESSION');

      // Case B: Violation did not re-appear after rollback (e.g. file stayed clean)
      findings[2].status = 'CLOSED'; // reset
      vi.spyOn(VerificationRunner, 'run').mockResolvedValue(new Set());
      verResult = await FixLifecycleIntegrator.verifyAndReopenFindings(restoredFiles, context, lifecycleManager);

      expect(verResult.findingsReopened).toBe(0);
      expect(findings[2].status).toBe('CLOSED');
    });
  });
});
