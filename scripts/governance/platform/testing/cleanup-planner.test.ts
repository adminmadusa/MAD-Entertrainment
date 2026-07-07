/**
 * Cleanup Planner & Git Command Builder — Unit Tests
 * Phase 4 (ADR-008)
 *
 * Coverage:
 *   CleanupPlanner:
 *     - All ACTION_MAP mappings produce correct ActionType
 *     - Confidence gate demotes DELETE_* to MANUAL_REVIEW at LOW/MEDIUM
 *     - HIGH and PROVEN confidence preserves destructive actions
 *     - Unknown ruleIds produce no action
 *     - INFO-severity rules (naming, lag) produce no action
 *     - Empty input produces empty output
 *     - CleanupAction contains zero shell syntax
 *
 *   GitCommandBuilder:
 *     - DELETE_LOCAL produces correct git branch -d command
 *     - DELETE_REMOTE strips origin/ prefix
 *     - REBASE_SYNC produces correct checkout && pull
 *     - MANUAL_REVIEW produces a shell comment, never executable
 *     - buildAll preserves 1-to-1 order
 *     - buildScript produces labelled blocks
 *     - builder contains no policy logic (pure syntax translation)
 */
import { describe, it, expect } from 'vitest';
import { CleanupPlanner } from '../planning/cleanup-planner';
import { GitCommandBuilder } from '../planning/git-command-builder';
import type { Finding, CleanupAction } from '../contracts/index';
import { Confidence } from '../contracts/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFinding(
  ruleId: string,
  affectedBranch: string,
  confidence: Confidence = Confidence.HIGH,
): Readonly<Finding> {
  return {
    id: `test-${ruleId}-${affectedBranch}`,
    ruleId,
    category: 'Branch Hygiene',
    severity: 'WARNING',
    title: `Test finding for ${ruleId}`,
    evidence: 'Test evidence',
    affectedBranch,
    confidence,
    recommendation: 'Test recommendation',
  };
}

function makeAction(
  branchName: string,
  actionType: CleanupAction['actionType'],
  targetBranch = 'develop',
  confidence: Confidence = Confidence.HIGH,
): CleanupAction {
  return {
    branchName,
    actionType,
    targetBranch,
    confidence,
    preconditions: [],
  };
}

// ---------------------------------------------------------------------------
// CleanupPlanner — ACTION_MAP mappings
// ---------------------------------------------------------------------------

describe('CleanupPlanner — ACTION_MAP mappings', () => {
  const planner = new CleanupPlanner();

  it('git.branch.stale → REBASE_SYNC', () => {
    const findings = [makeFinding('git.branch.stale', 'feat/old-branch')];
    const actions = planner.plan(findings);
    expect(actions).toHaveLength(1);
    expect(actions[0].actionType).toBe('REBASE_SYNC');
    expect(actions[0].branchName).toBe('feat/old-branch');
    expect(actions[0].targetBranch).toBe('develop');
  });

  it('git.branch.duplicate → DELETE_LOCAL (at HIGH confidence)', () => {
    const findings = [makeFinding('git.branch.duplicate', 'fix/dup-branch', Confidence.HIGH)];
    const actions = planner.plan(findings);
    expect(actions).toHaveLength(1);
    expect(actions[0].actionType).toBe('DELETE_LOCAL');
  });

  it('git.branch.orphaned → MANUAL_REVIEW', () => {
    const findings = [makeFinding('git.branch.orphaned', 'orphan-branch')];
    const actions = planner.plan(findings);
    expect(actions).toHaveLength(1);
    expect(actions[0].actionType).toBe('MANUAL_REVIEW');
  });

  it('git.branch.naming (INFO rule) → no action', () => {
    const findings = [makeFinding('git.branch.naming', 'bad-name')];
    const actions = planner.plan(findings);
    expect(actions).toHaveLength(0);
  });

  it('git.ancestry.lag (sync signal) → no action', () => {
    const findings = [makeFinding('git.ancestry.lag', 'feat/lagging')];
    const actions = planner.plan(findings);
    expect(actions).toHaveLength(0);
  });

  it('unknown ruleId → no action', () => {
    const findings = [makeFinding('unknown.rule.id', 'some-branch')];
    const actions = planner.plan(findings);
    expect(actions).toHaveLength(0);
  });

  it('empty findings array → empty actions array', () => {
    const actions = planner.plan([]);
    expect(actions).toHaveLength(0);
  });

  it('multiple findings → one action per mapped rule', () => {
    const findings = [
      makeFinding('git.branch.stale', 'feat/old'),
      makeFinding('git.branch.duplicate', 'fix/dup', Confidence.HIGH),
      makeFinding('git.branch.naming', 'bad-name'), // no action
      makeFinding('git.ancestry.lag', 'feat/behind'), // no action
    ];
    const actions = planner.plan(findings);
    expect(actions).toHaveLength(2);
    expect(actions.map(a => a.actionType)).toEqual(['REBASE_SYNC', 'DELETE_LOCAL']);
  });
});

// ---------------------------------------------------------------------------
// CleanupPlanner — confidence gate
// ---------------------------------------------------------------------------

describe('CleanupPlanner — confidence gate', () => {
  const planner = new CleanupPlanner();

  it('DELETE_LOCAL demoted to MANUAL_REVIEW at LOW confidence', () => {
    const findings = [makeFinding('git.branch.duplicate', 'fix/low', Confidence.LOW)];
    const actions = planner.plan(findings);
    expect(actions[0].actionType).toBe('MANUAL_REVIEW');
  });

  it('DELETE_LOCAL demoted to MANUAL_REVIEW at MEDIUM confidence', () => {
    const findings = [makeFinding('git.branch.duplicate', 'fix/med', Confidence.MEDIUM)];
    const actions = planner.plan(findings);
    expect(actions[0].actionType).toBe('MANUAL_REVIEW');
  });

  it('DELETE_LOCAL preserved at HIGH confidence', () => {
    const findings = [makeFinding('git.branch.duplicate', 'fix/high', Confidence.HIGH)];
    const actions = planner.plan(findings);
    expect(actions[0].actionType).toBe('DELETE_LOCAL');
  });

  it('DELETE_LOCAL preserved at PROVEN confidence', () => {
    const findings = [makeFinding('git.branch.duplicate', 'fix/proven', Confidence.PROVEN)];
    const actions = planner.plan(findings);
    expect(actions[0].actionType).toBe('DELETE_LOCAL');
  });

  it('REBASE_SYNC is never demoted — not a destructive action', () => {
    const findings = [makeFinding('git.branch.stale', 'feat/old', Confidence.LOW)];
    const actions = planner.plan(findings);
    expect(actions[0].actionType).toBe('REBASE_SYNC');
  });

  it('MANUAL_REVIEW is never demoted', () => {
    const findings = [makeFinding('git.branch.orphaned', 'orphan', Confidence.LOW)];
    const actions = planner.plan(findings);
    expect(actions[0].actionType).toBe('MANUAL_REVIEW');
  });
});

// ---------------------------------------------------------------------------
// CleanupPlanner — output purity (no shell syntax)
// ---------------------------------------------------------------------------

describe('CleanupPlanner — output contains no shell syntax', () => {
  const planner = new CleanupPlanner();
  const SHELL_PATTERN = /git (branch|push|checkout|pull|rebase)/;

  it('no CleanupAction field contains a shell command', () => {
    const findings = [
      makeFinding('git.branch.stale', 'feat/old'),
      makeFinding('git.branch.duplicate', 'fix/dup', Confidence.HIGH),
      makeFinding('git.branch.orphaned', 'orphan'),
    ];
    const actions = planner.plan(findings);
    for (const action of actions) {
      expect(action.branchName).not.toMatch(SHELL_PATTERN);
      expect(action.targetBranch).not.toMatch(SHELL_PATTERN);
      for (const pre of action.preconditions) {
        expect(pre).not.toMatch(SHELL_PATTERN);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// GitCommandBuilder — syntax correctness
// ---------------------------------------------------------------------------

describe('GitCommandBuilder — command syntax', () => {
  const builder = new GitCommandBuilder();

  it('DELETE_LOCAL → git branch -d <name>', () => {
    const cmd = builder.build(makeAction('feat/old', 'DELETE_LOCAL'));
    expect(cmd).toBe('git branch -d feat/old');
  });

  it('DELETE_REMOTE → git push origin --delete (strips origin/ prefix)', () => {
    const cmd = builder.build(makeAction('origin/feat/old', 'DELETE_REMOTE'));
    expect(cmd).toBe('git push origin --delete feat/old');
  });

  it('DELETE_REMOTE → git push origin --delete (no prefix to strip)', () => {
    const cmd = builder.build(makeAction('feat/old', 'DELETE_REMOTE'));
    expect(cmd).toBe('git push origin --delete feat/old');
  });

  it('REBASE_SYNC → git checkout && git pull', () => {
    const cmd = builder.build(makeAction('feat/lagging', 'REBASE_SYNC', 'develop'));
    expect(cmd).toBe('git checkout feat/lagging && git pull origin develop');
  });

  it('MANUAL_REVIEW → shell comment block (not executable)', () => {
    const action = makeAction('orphan-branch', 'MANUAL_REVIEW');
    const cmd = builder.build({ ...action, preconditions: ['Check X', 'Check Y'] });
    expect(cmd).toContain('# MANUAL_REVIEW');
    expect(cmd).toContain('# Branch:');
    expect(cmd).toContain('orphan-branch');
    expect(cmd).not.toMatch(/^git /m); // no executable git command
  });

  it('buildAll preserves 1-to-1 order', () => {
    const actions: CleanupAction[] = [
      makeAction('feat/a', 'DELETE_LOCAL'),
      makeAction('origin/feat/b', 'DELETE_REMOTE'),
      makeAction('feat/c', 'REBASE_SYNC'),
    ];
    const cmds = builder.buildAll(actions);
    expect(cmds).toHaveLength(3);
    expect(cmds[0]).toContain('feat/a');
    expect(cmds[1]).toContain('feat/b');
    expect(cmds[2]).toContain('feat/c');
  });

  it('buildScript produces labelled blocks', () => {
    const actions: CleanupAction[] = [
      makeAction('feat/a', 'DELETE_LOCAL'),
      makeAction('feat/b', 'REBASE_SYNC'),
    ];
    const script = builder.buildScript(actions);
    expect(script).toContain('[1]');
    expect(script).toContain('[2]');
    expect(script).toContain('DELETE_LOCAL');
    expect(script).toContain('REBASE_SYNC');
  });

  it('buildScript with empty actions → comment placeholder', () => {
    const script = builder.buildScript([]);
    expect(script).toContain('# No cleanup actions planned.');
  });
});

// ---------------------------------------------------------------------------
// GitCommandBuilder — policy boundary (never makes decisions)
// ---------------------------------------------------------------------------

describe('GitCommandBuilder — policy boundary', () => {
  const builder = new GitCommandBuilder();

  it('renders DELETE_LOCAL regardless of confidence — policy is caller responsibility', () => {
    // Builder receives whatever the planner decided — it never second-guesses
    const action = makeAction('feat/low-confidence', 'DELETE_LOCAL', 'develop', Confidence.LOW);
    const cmd = builder.build(action);
    // Should still render — caller (planner) already applied confidence gate
    expect(cmd).toBe('git branch -d feat/low-confidence');
  });

  it('renders MANUAL_REVIEW at PROVEN confidence — policy already decided by planner', () => {
    const action = makeAction('orphan', 'MANUAL_REVIEW', '', Confidence.PROVEN);
    const cmd = builder.build(action);
    expect(cmd).toContain('# MANUAL_REVIEW');
  });
});
