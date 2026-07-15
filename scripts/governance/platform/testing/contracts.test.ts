/**
 * Platform Compatibility Test Suite
 * Phase 2.5 — ADR-006
 *
 * Purpose: Protect the frozen public contracts from accidental breakage.
 * These tests act as a CI gate — any change that breaks a frozen interface
 * must fail here before reaching downstream consumers.
 *
 * Exit criteria (Roadmap Phase 2.5):
 *   ✓ All 7 test areas pass
 *   ✓ A deliberate breaking change causes at least one test to fail
 *
 * Coverage areas:
 *   1. Provider loading      — GovernanceProvider shape
 *   2. Rule registration     — GovernanceRule shape + execution contract
 *   3. Snapshot validation   — DomainSnapshot structural assertion
 *   4. Report generation     — ReportModel serializes to valid JSON
 *   5. Event publication     — EventBroker subscriber receives events
 *   6. Manifest compatibility — platform.json schema validation
 *   7. Capability negotiation — incompatible provider version rejected
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import type {
  GovernanceProvider,
  GovernanceRule,
  DomainSnapshot,
  EngineContext,
  Finding,
  ReportModel,
  ReportWriter,
  EventBroker,
  EngineEvent,
  GovernanceConfig,
  RepositoryCapabilities,
} from '../contracts/index.js';
import { Confidence, BranchLifecycleState } from '../contracts/index.js';

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const STUB_SNAPSHOT: DomainSnapshot = {
  providerId: 'git',
  timestamp: new Date().toISOString(),
  schemaVersion: '1.0',
  data: { branches: [], remotes: [] },
};

const STUB_CONFIG: GovernanceConfig = {
  stale_commit_threshold: 30,
  integration_branches: ['develop', 'main'],
  protected_branches: ['develop', 'live', 'main'],
  max_branch_age_days: 90,
};

const STUB_CAPABILITIES: RepositoryCapabilities = {
  supportsWorktrees: false,
  supportsSubmodules: false,
  supportsLFS: false,
  hasRemoteOrigin: true,
  defaultBranch: 'develop',
};

const STUB_CONTEXT: EngineContext = {
  snapshot: STUB_SNAPSHOT,
  capabilities: STUB_CAPABILITIES,
  config: STUB_CONFIG,
};

const STUB_FINDING: Finding = {
  id: 'F-001',
  ruleId: 'git.branch.stale',
  category: 'Branch Hygiene',
  severity: 'WARNING',
  title: 'Stale branch detected',
  evidence: 'Branch has no commits in 45 days',
  affectedBranch: 'feat/old-feature',
  confidence: Confidence.HIGH,
  recommendation: 'Merge or archive this branch',
};

// ---------------------------------------------------------------------------
// Area 1 — Provider loading
// GovernanceProvider shape must satisfy the frozen interface contract.
// ---------------------------------------------------------------------------

describe('Area 1 — Provider loading (GovernanceProvider contract)', () => {
  it('should accept a minimal valid GovernanceProvider implementation', () => {
    const provider: GovernanceProvider = {
      metadata: {
        id: 'git',
        name: 'Git Governance Provider',
        version: '1.0.0',
        engineVersion: '^1.0.0',
        apiVersion: '1.0',
        description: 'Reference git provider',
      },
      collect: async (_context: EngineContext): Promise<DomainSnapshot> =>
        STUB_SNAPSHOT,
      rules: (): GovernanceRule[] => [],
      writers: (): ReportWriter[] => [],
    };

    expect(provider.metadata.id).toBe('git');
    expect(provider.metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(provider.metadata.engineVersion).toMatch(/^\^?\d+\.\d+/);
    expect(typeof provider.collect).toBe('function');
    expect(typeof provider.rules).toBe('function');
    expect(typeof provider.writers).toBe('function');
  });

  it('collect() should return a DomainSnapshot with required fields', async () => {
    const provider: GovernanceProvider = {
      metadata: {
        id: 'git',
        name: 'Test',
        version: '1.0.0',
        engineVersion: '^1.0.0',
        apiVersion: '1.0',
        description: '',
      },
      collect: async () => STUB_SNAPSHOT,
      rules: () => [],
      writers: () => [],
    };

    const snapshot = await provider.collect(STUB_CONTEXT);
    expect(snapshot.providerId).toBeDefined();
    expect(snapshot.timestamp).toBeDefined();
    expect(snapshot.schemaVersion).toBeDefined();
    expect(snapshot.data).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Area 2 — Rule registration
// GovernanceRule shape and execution contract.
// ---------------------------------------------------------------------------

describe('Area 2 — Rule registration (GovernanceRule contract)', () => {
  it('should accept a minimal valid GovernanceRule implementation', () => {
    const rule: GovernanceRule = {
      metadata: {
        id: 'git.branch.stale',
        name: 'Stale Branch Rule',
        version: '1.0.0',
        category: 'Branch Hygiene',
        severity: 'WARNING',
        enabled: true,
        configurable: true,
        tags: ['branch', 'hygiene'],
        dependencies: [],
      },
      execute: (_context: EngineContext) => [STUB_FINDING],
    };

    expect(rule.metadata.id).toContain('.');
    expect(rule.metadata.dependencies).toBeInstanceOf(Array);
    expect(typeof rule.execute).toBe('function');
  });

  it('execute() should return an array of immutable Findings', () => {
    const rule: GovernanceRule = {
      metadata: {
        id: 'git.branch.orphaned',
        name: 'Orphaned Branch Rule',
        version: '1.0.0',
        category: 'Branch Hygiene',
        severity: 'INFO',
        enabled: true,
        configurable: false,
        tags: [],
        dependencies: [],
      },
      execute: () => [STUB_FINDING],
    };

    const results = rule.execute(STUB_CONTEXT);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].ruleId).toBe('git.branch.stale');
    expect(results[0].confidence).toBe(Confidence.HIGH);
  });

  it('execute() with no findings should return an empty array, not null', () => {
    const rule: GovernanceRule = {
      metadata: {
        id: 'git.branch.clean',
        name: 'Clean Branch Rule',
        version: '1.0.0',
        category: 'Branch Hygiene',
        severity: 'INFO',
        enabled: true,
        configurable: false,
        tags: [],
        dependencies: [],
      },
      execute: () => [],
    };

    const results = rule.execute(STUB_CONTEXT);
    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBe(0);
  });

  it('rules with dependencies should declare them in metadata.dependencies', () => {
    const rule: GovernanceRule = {
      metadata: {
        id: 'git.ancestry.lag',
        name: 'Integration Lag Rule',
        version: '1.0.0',
        category: 'Git Governance',
        severity: 'WARNING',
        enabled: true,
        configurable: true,
        tags: ['ancestry'],
        dependencies: ['git.branch.stale'],
      },
      execute: () => [],
    };

    expect(rule.metadata.dependencies).toContain('git.branch.stale');
  });
});

// ---------------------------------------------------------------------------
// Area 3 — Snapshot validation
// DomainSnapshot structural assertion.
// ---------------------------------------------------------------------------

describe('Area 3 — Snapshot validation (DomainSnapshot contract)', () => {
  it('should accept a structurally valid DomainSnapshot', () => {
    const snapshot: DomainSnapshot = {
      providerId: 'git',
      timestamp: '2026-07-04T14:00:00.000Z',
      schemaVersion: '1.0',
      data: { branches: [] },
    };

    expect(snapshot.providerId).toBe('git');
    expect(new Date(snapshot.timestamp).toISOString()).toBe(snapshot.timestamp);
    expect(snapshot.schemaVersion).toBeDefined();
    expect(typeof snapshot.data).toBe('object');
  });

  it('snapshot.data should accept arbitrary domain-specific payloads', () => {
    const snapshot: DomainSnapshot = {
      providerId: 'git',
      timestamp: new Date().toISOString(),
      schemaVersion: '1.0',
      data: {
        branches: [{ name: 'feat/test', ahead: 2, behind: 0 }],
        remotes: ['origin'],
        workingTreeClean: true,
      },
    };

    expect((snapshot.data['branches'] as unknown[]).length).toBe(1);
    expect(snapshot.data['workingTreeClean']).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Area 4 — Report generation
// ReportModel must serialize to valid JSON.
// ---------------------------------------------------------------------------

describe('Area 4 — Report generation (ReportModel contract)', () => {
  const model: ReportModel = {
    schemaVersion: '1.0',
    engineVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    repository: 'MAD-Entertrainment',
    scores: {
      overall: 63,
      branchHygiene: 70,
      repositoryHealth: 70,
      technicalDebt: 50,
      gitGovernance: 60,
    },
    findings: [STUB_FINDING],
    actions: [],
  };

  it('should serialize ReportModel to valid JSON', () => {
    const json = JSON.stringify(model);
    const parsed = JSON.parse(json) as ReportModel;
    expect(parsed.schemaVersion).toBe('1.0');
    expect(parsed.scores.overall).toBe(63);
  });

  it('all score dimensions should be numbers between 0 and 100', () => {
    const { scores } = model;
    for (const [key, value] of Object.entries(scores)) {
      expect(value, `score.${key} out of range`).toBeGreaterThanOrEqual(0);
      expect(value, `score.${key} out of range`).toBeLessThanOrEqual(100);
    }
  });

  it('ReportWriter.write() should be called with the model', () => {
    const writeSpy = vi.fn();
    const writer: ReportWriter = {
      id: 'json-writer',
      format: 'json',
      write: writeSpy,
    };
    writer.write(model);
    expect(writeSpy).toHaveBeenCalledOnce();
    expect(writeSpy).toHaveBeenCalledWith(model);
  });

  it('findings array should be immutable (ReadonlyArray)', () => {
    // TypeScript enforces this at compile time; this test confirms the
    // runtime value is a standard array (not null/undefined).
    expect(Array.isArray(model.findings)).toBe(true);
    expect(Array.isArray(model.actions)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Area 5 — Event publication
// EventBroker subscriber must receive published events.
// ---------------------------------------------------------------------------

describe('Area 5 — Event publication (EventBroker contract)', () => {
  class StubEventBroker implements EventBroker {
    private listeners: Array<(event: EngineEvent) => void> = [];
    subscribe(listener: (event: EngineEvent) => void): void {
      this.listeners.push(listener);
    }
    publish(event: EngineEvent): void {
      this.listeners.forEach(l => l(event));
    }
  }

  it('subscriber should receive CollectionStarted event', () => {
    const broker = new StubEventBroker();
    const received: EngineEvent[] = [];
    broker.subscribe(e => received.push(e));
    broker.publish({ type: 'CollectionStarted', payload: { providerId: 'git' } });
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('CollectionStarted');
  });

  it('subscriber should receive FindingCreated event with the finding', () => {
    const broker = new StubEventBroker();
    const received: EngineEvent[] = [];
    broker.subscribe(e => received.push(e));
    broker.publish({ type: 'FindingCreated', payload: STUB_FINDING });
    const event = received[0];
    expect(event.type).toBe('FindingCreated');
    if (event.type === 'FindingCreated') {
      expect(event.payload.ruleId).toBe('git.branch.stale');
    }
  });

  it('multiple subscribers should each receive the published event', () => {
    const broker = new StubEventBroker();
    const callA = vi.fn();
    const callB = vi.fn();
    broker.subscribe(callA);
    broker.subscribe(callB);
    broker.publish({ type: 'ReportWritten', payload: { paths: ['/tmp/report.md'] } });
    expect(callA).toHaveBeenCalledOnce();
    expect(callB).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Area 6 — Manifest compatibility
// platform.json must contain required fields with correct types.
// ---------------------------------------------------------------------------

describe('Area 6 — Manifest compatibility (platform.json schema)', () => {
  // Replace __dirname-style resolution with import.meta approach for ESM
  const manifestRaw = readFileSync(
    resolve(process.cwd(), 'scripts/governance/platform/platform.json'),
    'utf-8'
  );
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;

  it('platform.json should contain platformVersion', () => {
    expect(manifest['platformVersion']).toBeDefined();
    expect(typeof manifest['platformVersion']).toBe('string');
  });

  it('platform.json platformVersion should follow semver format', () => {
    const semver = /^\d+\.\d+\.\d+$/;
    expect(String(manifest['platformVersion'])).toMatch(semver);
  });

  it('platform.json should contain apiVersion', () => {
    expect(manifest['apiVersion']).toBeDefined();
  });

  it('platform.json should contain schemaVersion', () => {
    expect(manifest['schemaVersion']).toBeDefined();
  });

  it('platform.json providers should be a non-empty array', () => {
    expect(Array.isArray(manifest['providers'])).toBe(true);
    expect((manifest['providers'] as unknown[]).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Area 7 — Capability negotiation
// A provider whose engineVersion is incompatible must be rejected.
// ---------------------------------------------------------------------------

describe('Area 7 — Capability negotiation (provider version compatibility)', () => {
  /** Minimal semver range check: "^X.Y.Z" must share the same major as platform */
  function isCompatible(providerEngineVersion: string, platformVersion: string): boolean {
    // Supports "^X.Y.Z" and "X.Y.Z" range expressions
    const cleanProvider = providerEngineVersion.replace(/^\^/, '');
    const providerMajor = parseInt(cleanProvider.split('.')[0], 10);
    const platformMajor = parseInt(platformVersion.split('.')[0], 10);
    return providerMajor === platformMajor;
  }

  const PLATFORM_VERSION = '1.0.0';

  it('compatible provider (^1.0.0) should be accepted', () => {
    expect(isCompatible('^1.0.0', PLATFORM_VERSION)).toBe(true);
  });

  it('compatible provider (1.0.0 exact) should be accepted', () => {
    expect(isCompatible('1.0.0', PLATFORM_VERSION)).toBe(true);
  });

  it('incompatible provider with major version 0 should be rejected', () => {
    expect(isCompatible('^0.9.0', PLATFORM_VERSION)).toBe(false);
  });

  it('incompatible provider with future major version 2 should be rejected', () => {
    expect(isCompatible('^2.0.0', PLATFORM_VERSION)).toBe(false);
  });

  it('BranchLifecycleState enum should contain all 8 required states', () => {
    const requiredStates = [
      'ACTIVE', 'READY_FOR_PR', 'OPEN_PR', 'MERGED',
      'DELETE_READY', 'STALE', 'ARCHIVED', 'ORPHANED',
    ];
    for (const state of requiredStates) {
      expect(
        Object.values(BranchLifecycleState),
        `Missing lifecycle state: ${state}`
      ).toContain(state);
    }
  });
});
