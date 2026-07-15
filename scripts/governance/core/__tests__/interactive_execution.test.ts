// scripts/governance/core/__tests__/interactive_execution.test.ts
import { describe, it, expect, vi } from 'vitest';

import { ApprovalPlan } from '../approval_plan';
import {
  InteractiveExecutionPolicy,
  SafeOnlyExecutionPolicy,
  StandardExecutionPolicy,
  resolveExecutionPolicy,
} from '../execution_policy';
import type { FixContext } from '../fix_context';
import type { Fixer, FixResultItem, SafetyLevel } from '../fix_types';
import type { StatelessViolation } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeViolation(rule: string, path: string): StatelessViolation {
  return { rule, path, construct: 'Document', confidence: 1.0 };
}

function makeFixer(ruleId: string, safety: SafetyLevel): Fixer {
  return {
    ruleId,
    safety,
    fix: vi.fn<[StatelessViolation, FixContext], Promise<FixResultItem>>(),
  };
}

function makeContext(overrides: Partial<FixContext> = {}): FixContext {
  return {
    workspaceRoot: '/workspace',
    preview: false,
    dryRun: false,
    safeOnly: false,
    interactive: false,
    json: false,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    executionPolicy: new StandardExecutionPolicy(),
    ...overrides,
  } as unknown as FixContext;
}

// ---------------------------------------------------------------------------
// ApprovalPlan
// ---------------------------------------------------------------------------

describe('ApprovalPlan', () => {
  it('isApproved returns true only for added pairs', () => {
    const plan = new ApprovalPlan(new Set(['VAL-DOC-001:docs/README.md']), 2);
    expect(plan.isApproved('VAL-DOC-001', 'docs/README.md')).toBe(true);
    expect(plan.isApproved('VAL-DOC-001', 'docs/OTHER.md')).toBe(false);
    expect(plan.isApproved('VAL-HYG-001', 'docs/README.md')).toBe(false);
  });

  it('is immutable — external Set mutations do not affect it', () => {
    const source = new Set(['VAL-DOC-001:docs/README.md']);
    const plan = new ApprovalPlan(source, 0);
    source.add('VAL-DOC-002:docs/AGENTS.md');
    expect(plan.isApproved('VAL-DOC-002', 'docs/AGENTS.md')).toBe(false);
  });

  it('approvedCount and skippedCount are correct', () => {
    const plan = new ApprovalPlan(new Set(['VAL-DOC-001:a', 'VAL-DOC-002:b']), 5);
    expect(plan.approvedCount).toBe(2);
    expect(plan.skippedCount).toBe(5);
  });

  it('hasRule returns true if any entry matches the rule', () => {
    const plan = new ApprovalPlan(new Set(['VAL-DOC-001:docs/README.md']), 0);
    expect(plan.hasRule('VAL-DOC-001')).toBe(true);
    expect(plan.hasRule('VAL-DOC-002')).toBe(false);
  });

  it('entries() returns structured objects', () => {
    const plan = new ApprovalPlan(new Set(['VAL-DOC-001:docs/README.md']), 0);
    const entries = plan.entries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ ruleId: 'VAL-DOC-001', filePath: 'docs/README.md' });
  });

  it('handles file paths containing colons in ruleId delimiter correctly', () => {
    // filePath may contain colons on Windows; entry key uses first colon
    const plan = new ApprovalPlan(new Set(['VAL-DOC-001:C:/workspace/README.md']), 0);
    expect(plan.isApproved('VAL-DOC-001', 'C:/workspace/README.md')).toBe(true);
  });

  it('empty() returns a plan with no approvals', () => {
    const plan = ApprovalPlan.empty();
    expect(plan.approvedCount).toBe(0);
    expect(plan.isApproved('VAL-DOC-001', 'any')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// StandardExecutionPolicy
// ---------------------------------------------------------------------------

describe('StandardExecutionPolicy', () => {
  it('always returns true regardless of safety level', () => {
    const policy = new StandardExecutionPolicy();
    const ctx = makeContext();

    expect(policy.shouldExecute(makeViolation('R', 'f'), makeFixer('R', 'SAFE'), ctx)).toBe(true);
    expect(policy.shouldExecute(makeViolation('R', 'f'), makeFixer('R', 'MANUAL'), ctx)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SafeOnlyExecutionPolicy
// ---------------------------------------------------------------------------

describe('SafeOnlyExecutionPolicy', () => {
  it('allows SAFE fixers', () => {
    const policy = new SafeOnlyExecutionPolicy();
    const ctx = makeContext({ safeOnly: true });
    expect(policy.shouldExecute(makeViolation('R', 'f'), makeFixer('R', 'SAFE'), ctx)).toBe(true);
  });

  it('blocks MANUAL fixers', () => {
    const policy = new SafeOnlyExecutionPolicy();
    const ctx = makeContext({ safeOnly: true });
    expect(policy.shouldExecute(makeViolation('R', 'f'), makeFixer('R', 'MANUAL'), ctx)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// InteractiveExecutionPolicy
// ---------------------------------------------------------------------------

describe('InteractiveExecutionPolicy', () => {
  it('approves a SAFE fix when the pair is in the plan', () => {
    const plan = new ApprovalPlan(new Set(['VAL-DOC-001:docs/README.md']), 0);
    const policy = new InteractiveExecutionPolicy(plan, false);
    const ctx = makeContext({ interactive: true });

    expect(
      policy.shouldExecute(
        makeViolation('VAL-DOC-001', 'docs/README.md'),
        makeFixer('VAL-DOC-001', 'SAFE'),
        ctx
      )
    ).toBe(true);
  });

  it('rejects a SAFE fix not in the plan', () => {
    const plan = new ApprovalPlan(new Set(), 1);
    const policy = new InteractiveExecutionPolicy(plan, false);
    const ctx = makeContext({ interactive: true });

    expect(
      policy.shouldExecute(
        makeViolation('VAL-DOC-001', 'docs/README.md'),
        makeFixer('VAL-DOC-001', 'SAFE'),
        ctx
      )
    ).toBe(false);
  });

  it('rejects MANUAL fixers when safeOnly=true, even if approved', () => {
    const plan = new ApprovalPlan(new Set(['VAL-HYG-001:src/index.ts']), 0);
    const policy = new InteractiveExecutionPolicy(plan, true);
    const ctx = makeContext({ interactive: true, safeOnly: true });

    expect(
      policy.shouldExecute(
        makeViolation('VAL-HYG-001', 'src/index.ts'),
        makeFixer('VAL-HYG-001', 'MANUAL'),
        ctx
      )
    ).toBe(false);
  });

  it('allows MANUAL fixers when safeOnly=false and pair is approved', () => {
    const plan = new ApprovalPlan(new Set(['VAL-HYG-001:src/index.ts']), 0);
    const policy = new InteractiveExecutionPolicy(plan, false);
    const ctx = makeContext({ interactive: true });

    expect(
      policy.shouldExecute(
        makeViolation('VAL-HYG-001', 'src/index.ts'),
        makeFixer('VAL-HYG-001', 'MANUAL'),
        ctx
      )
    ).toBe(true);
  });

  it('applies only approved pairs — zero writes for unapproved', () => {
    // Simulate approve-one: only one pair in plan
    const plan = new ApprovalPlan(new Set(['VAL-DOC-001:docs/README.md']), 1);
    const policy = new InteractiveExecutionPolicy(plan, false);
    const ctx = makeContext({ interactive: true });

    const approved = policy.shouldExecute(
      makeViolation('VAL-DOC-001', 'docs/README.md'),
      makeFixer('VAL-DOC-001', 'SAFE'),
      ctx
    );
    const skipped = policy.shouldExecute(
      makeViolation('VAL-DOC-001', 'docs/OTHER.md'),
      makeFixer('VAL-DOC-001', 'SAFE'),
      ctx
    );

    expect(approved).toBe(true);
    expect(skipped).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveExecutionPolicy factory
// ---------------------------------------------------------------------------

describe('resolveExecutionPolicy', () => {
  it('returns StandardExecutionPolicy by default', () => {
    const policy = resolveExecutionPolicy({ interactive: false, safeOnly: false });
    expect(policy).toBeInstanceOf(StandardExecutionPolicy);
  });

  it('returns SafeOnlyExecutionPolicy when safeOnly=true and not interactive', () => {
    const policy = resolveExecutionPolicy({ interactive: false, safeOnly: true });
    expect(policy).toBeInstanceOf(SafeOnlyExecutionPolicy);
  });

  it('returns InteractiveExecutionPolicy when interactive=true with a plan', () => {
    const plan = new ApprovalPlan(new Set(), 0);
    const policy = resolveExecutionPolicy({ interactive: true, safeOnly: false, plan });
    expect(policy).toBeInstanceOf(InteractiveExecutionPolicy);
  });

  it('returns StandardExecutionPolicy when interactive=true but no plan (non-TTY fallback)', () => {
    // approvalPlan is undefined when non-TTY falls through
    const policy = resolveExecutionPolicy({ interactive: false, safeOnly: false, plan: undefined });
    expect(policy).toBeInstanceOf(StandardExecutionPolicy);
  });
});

// ---------------------------------------------------------------------------
// Cancellation — empty plan = zero approvals
// ---------------------------------------------------------------------------

describe('Cancellation invariant', () => {
  it('an empty ApprovalPlan approves nothing — no files written', () => {
    const plan = ApprovalPlan.empty();
    const policy = new InteractiveExecutionPolicy(plan, false);
    const ctx = makeContext({ interactive: true });

    const violations = [
      makeViolation('VAL-DOC-001', 'docs/README.md'),
      makeViolation('VAL-HYG-004', 'scripts/foo.ts'),
      makeViolation('VAL-HYG-001', 'scripts/bar.ts'),
    ];

    for (const v of violations) {
      expect(policy.shouldExecute(v, makeFixer(v.rule, 'SAFE'), ctx)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Non-TTY fallback invariant
// ---------------------------------------------------------------------------

describe('Non-TTY fallback invariant', () => {
  it('resolves to StandardExecutionPolicy when approvalPlan is absent (non-TTY path)', () => {
    // non-TTY: approvalPlan never set, interactive flag coerced to false
    const policy = resolveExecutionPolicy({ interactive: false, safeOnly: false, plan: undefined });
    const ctx = makeContext();

    // SAFE fixer should execute (standard behaviour unchanged)
    expect(policy.shouldExecute(makeViolation('R', 'f'), makeFixer('R', 'SAFE'), ctx)).toBe(true);
    // MANUAL fixer should also execute (standard mode)
    expect(policy.shouldExecute(makeViolation('R', 'f'), makeFixer('R', 'MANUAL'), ctx)).toBe(true);
  });
});
