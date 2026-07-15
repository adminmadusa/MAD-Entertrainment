/**
 * RuleRegistry Unit Tests — Phase 3 (ADR-007)
 *
 * Verifies:
 *   - Registration and deduplication
 *   - Dependency ordering (topological sort)
 *   - Missing dependency detection
 *   - Circular dependency detection at resolveExecutionOrder()
 *   - All five Git rules satisfy GovernanceRule contract
 */
import { describe, it, expect } from 'vitest';
import {
  RuleRegistry,
  DuplicateRuleError,
  CircularDependencyError,
  MissingDependencyError,
} from '../engine/rule-registry';
import type { GovernanceRule, EngineContext, Finding } from '../contracts/index';
import { StaleBranchRule } from '../rules/StaleBranchRule';
import { OrphanedBranchRule } from '../rules/OrphanedBranchRule';
import { DuplicateTreeRule } from '../rules/DuplicateTreeRule';
import { IntegrationLagRule } from '../rules/IntegrationLagRule';
import { BranchNamingRule } from '../rules/BranchNamingRule';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRule(id: string, deps: string[] = []): GovernanceRule {
  return {
    metadata: {
      id,
      name: `Rule ${id}`,
      version: '1.0.0',
      category: 'Branch Hygiene',
      severity: 'INFO',
      enabled: true,
      configurable: false,
      tags: [],
      dependencies: deps,
    },
    execute: (): ReadonlyArray<Readonly<Finding>> => [],
  };
}

// ---------------------------------------------------------------------------
// RuleRegistry — registration
// ---------------------------------------------------------------------------

describe('RuleRegistry — registration', () => {
  it('should register a rule and report size = 1', () => {
    const registry = new RuleRegistry();
    registry.register(makeRule('a'));
    expect(registry.size).toBe(1);
    expect(registry.has('a')).toBe(true);
  });

  it('should register multiple rules', () => {
    const registry = new RuleRegistry();
    registry.register(makeRule('a'));
    registry.register(makeRule('b'));
    registry.register(makeRule('c'));
    expect(registry.size).toBe(3);
  });

  it('should throw DuplicateRuleError when the same ID is registered twice', () => {
    const registry = new RuleRegistry();
    registry.register(makeRule('a'));
    expect(() => registry.register(makeRule('a'))).toThrowError(DuplicateRuleError);
  });

  it('has() should return false for unregistered rule IDs', () => {
    const registry = new RuleRegistry();
    expect(registry.has('nonexistent')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RuleRegistry — topological ordering
// ---------------------------------------------------------------------------

describe('RuleRegistry — resolveExecutionOrder()', () => {
  it('should return rules with no dependencies in registration order', () => {
    const registry = new RuleRegistry();
    registry.register(makeRule('naming'));
    registry.register(makeRule('stale'));
    registry.register(makeRule('orphaned'));
    const order = registry.resolveExecutionOrder();
    expect(order.map(r => r.metadata.id)).toEqual(['naming', 'stale', 'orphaned']);
  });

  it('should resolve a simple A → B dependency (B must run before A)', () => {
    const registry = new RuleRegistry();
    registry.register(makeRule('a', ['b']));
    registry.register(makeRule('b'));
    const order = registry.resolveExecutionOrder();
    const ids = order.map(r => r.metadata.id);
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('a'));
  });

  it('should resolve a 3-level dependency chain: naming → stale → lag', () => {
    const registry = new RuleRegistry();
    registry.register(makeRule('lag', ['stale']));
    registry.register(makeRule('stale', ['naming']));
    registry.register(makeRule('naming'));
    const order = registry.resolveExecutionOrder();
    const ids = order.map(r => r.metadata.id);
    expect(ids.indexOf('naming')).toBeLessThan(ids.indexOf('stale'));
    expect(ids.indexOf('stale')).toBeLessThan(ids.indexOf('lag'));
  });

  it('should resolve the actual Git rule DAG correctly', () => {
    // naming (no deps), stale (no deps), orphaned (no deps), duplicate (no deps)
    // lag depends on: stale, orphaned, duplicate
    const registry = new RuleRegistry();
    registry.register(new BranchNamingRule());
    registry.register(new StaleBranchRule());
    registry.register(new OrphanedBranchRule());
    registry.register(new DuplicateTreeRule());
    registry.register(new IntegrationLagRule());

    const order = registry.resolveExecutionOrder();
    const ids = order.map(r => r.metadata.id);

    const lagIdx = ids.indexOf('git.ancestry.lag');
    expect(ids.indexOf('git.branch.stale')).toBeLessThan(lagIdx);
    expect(ids.indexOf('git.branch.orphaned')).toBeLessThan(lagIdx);
    expect(ids.indexOf('git.branch.duplicate')).toBeLessThan(lagIdx);
  });

  it('should throw MissingDependencyError if a dependency is not registered', () => {
    const registry = new RuleRegistry();
    registry.register(makeRule('a', ['missing-dep']));
    expect(() => registry.resolveExecutionOrder()).toThrowError(MissingDependencyError);
  });

  it('should throw CircularDependencyError for a direct cycle A → B → A', () => {
    const registry = new RuleRegistry();
    registry.register(makeRule('a', ['b']));
    registry.register(makeRule('b', ['a']));
    expect(() => registry.resolveExecutionOrder()).toThrowError(CircularDependencyError);
  });

  it('should throw CircularDependencyError for an indirect cycle A → B → C → A', () => {
    const registry = new RuleRegistry();
    registry.register(makeRule('a', ['c']));
    registry.register(makeRule('b', ['a']));
    registry.register(makeRule('c', ['b']));
    expect(() => registry.resolveExecutionOrder()).toThrowError(CircularDependencyError);
  });
});

// ---------------------------------------------------------------------------
// All five Git rules — GovernanceRule contract compliance
// ---------------------------------------------------------------------------

describe('Git Rules — GovernanceRule contract compliance', () => {
  const rules: GovernanceRule[] = [
    new BranchNamingRule(),
    new StaleBranchRule(),
    new OrphanedBranchRule(),
    new DuplicateTreeRule(),
    new IntegrationLagRule(),
  ];

  for (const rule of rules) {
    it(`${rule.metadata.id} — metadata.id follows namespaced format`, () => {
      expect(rule.metadata.id).toMatch(/^[a-z]+\.[a-z]+\.[a-z]+$/);
    });

    it(`${rule.metadata.id} — metadata.version follows semver`, () => {
      expect(rule.metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it(`${rule.metadata.id} — dependencies is an array`, () => {
      expect(Array.isArray(rule.metadata.dependencies)).toBe(true);
    });

    it(`${rule.metadata.id} — execute() with empty snapshot returns array (not null)`, () => {
      const context: EngineContext = {
        snapshot: {
          providerId: 'git',
          timestamp: new Date().toISOString(),
          schemaVersion: '1.0',
          data: {
            branches: [],
            verifications: new Map(),
            isWorkingTreeClean: true,
            danglingCommitsCount: 0,
            worktreesCount: 0,
          },
        },
        capabilities: {
          supportsWorktrees: false,
          supportsSubmodules: false,
          supportsLFS: false,
          hasRemoteOrigin: true,
          defaultBranch: 'develop',
        },
        config: {
          stale_commit_threshold: 30,
          integration_branches: ['develop', 'main'],
          protected_branches: ['develop', 'live', 'main'],
          max_branch_age_days: 90,
        },
      };

      // Cast config to include legacy fields expected by git rules
      (context.config as unknown as Record<string, unknown>)['stale_days'] = 90;
      (context.config as unknown as Record<string, unknown>)['max_branch_age'] = 180;

      const results = rule.execute(context);
      expect(Array.isArray(results)).toBe(true);
    });
  }
});
