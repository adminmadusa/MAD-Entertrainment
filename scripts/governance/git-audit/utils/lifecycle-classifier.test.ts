import { describe, it, expect } from 'vitest';
import { LifecycleClassifier } from './lifecycle-classifier';
import type { BranchSignals } from './lifecycle-classifier';
import { BranchLifecycleState } from '../../platform/contracts';

// Helper to make a default signals set (all false/neutral)
function makeSignals(overrides: Partial<BranchSignals> = {}): BranchSignals {
  return {
    isProtected: false,
    isMerged: false,
    isSquashMerged: false,
    hasOpenPR: false,
    isStale: false,
    hasUpstream: true,
    ahead: 0,
    behind: 0,
    hasUniqueCommits: false,
    isAnotherBranchBasedOnIt: false,
    isPartOfActiveStack: false,
    isLegacyDefault: false,
    ...overrides,
  };
}

describe('LifecycleClassifier (Pure data-driven classification)', () => {
  it('should classify legacy default as ARCHIVED', () => {
    const signals = makeSignals({ isLegacyDefault: true });
    const result = LifecycleClassifier.classify(signals);
    expect(result.state).toBe(BranchLifecycleState.ARCHIVED);
    expect(result.confidence).toBe('PROVEN');
    expect(result.reason).toContain('legacy repository default');
  });

  it('should classify merged branch with no blockers as DELETE_READY', () => {
    const signals = makeSignals({ isMerged: true });
    const result = LifecycleClassifier.classify(signals);
    expect(result.state).toBe(BranchLifecycleState.DELETE_READY);
    expect(result.confidence).toBe('PROVEN');
  });

  it('should classify squash-merged branch with no blockers as DELETE_READY', () => {
    const signals = makeSignals({ isSquashMerged: true });
    const result = LifecycleClassifier.classify(signals);
    expect(result.state).toBe(BranchLifecycleState.DELETE_READY);
    expect(result.confidence).toBe('PROVEN');
  });

  it('should classify merged branch with active stack dependency as MERGED', () => {
    const signals = makeSignals({ isMerged: true, isPartOfActiveStack: true });
    const result = LifecycleClassifier.classify(signals);
    expect(result.state).toBe(BranchLifecycleState.MERGED);
    expect(result.confidence).toBe('HIGH');
  });

  it('should classify merged branch with downstream parent dependency as MERGED', () => {
    const signals = makeSignals({ isSquashMerged: true, isAnotherBranchBasedOnIt: true });
    const result = LifecycleClassifier.classify(signals);
    expect(result.state).toBe(BranchLifecycleState.MERGED);
    expect(result.confidence).toBe('HIGH');
  });

  it('should classify unmerged branch with open PR as OPEN_PR', () => {
    const signals = makeSignals({ hasOpenPR: true });
    const result = LifecycleClassifier.classify(signals);
    expect(result.state).toBe(BranchLifecycleState.OPEN_PR);
    expect(result.confidence).toBe('HIGH');
  });

  it('should classify unmerged stale branch as STALE', () => {
    const signals = makeSignals({ isStale: true });
    const result = LifecycleClassifier.classify(signals);
    expect(result.state).toBe(BranchLifecycleState.STALE);
    expect(result.confidence).toBe('HIGH');
  });

  it('should classify local-only unmerged branch with no commits as ORPHANED', () => {
    const signals = makeSignals({ hasUpstream: false, hasUniqueCommits: false });
    const result = LifecycleClassifier.classify(signals);
    expect(result.state).toBe(BranchLifecycleState.ORPHANED);
    expect(result.confidence).toBe('HIGH');
  });

  it('should classify unmerged branch ahead of develop (no open PR) as READY_FOR_PR', () => {
    const signals = makeSignals({ ahead: 3 });
    const result = LifecycleClassifier.classify(signals);
    expect(result.state).toBe(BranchLifecycleState.READY_FOR_PR);
    expect(result.confidence).toBe('HIGH');
  });

  it('should classify active branch within thresholds as ACTIVE', () => {
    const signals = makeSignals({ hasUpstream: true, ahead: 0, isStale: false });
    const result = LifecycleClassifier.classify(signals);
    expect(result.state).toBe(BranchLifecycleState.ACTIVE);
    expect(result.confidence).toBe('MEDIUM');
  });

  it('should treat isProtected orthogonally (does not override other lifecycle states except Active default)', () => {
    const signals = makeSignals({ isProtected: true, isMerged: true });
    // It should be DELETE_READY or MERGED because the branch is merged (orthogonal protection)
    const result = LifecycleClassifier.classify(signals);
    expect(result.state).toBe(BranchLifecycleState.DELETE_READY);
  });
});
