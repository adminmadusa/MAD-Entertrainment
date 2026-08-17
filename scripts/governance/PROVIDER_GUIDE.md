# Repository Governance Platform — Provider SDK & Reference Guide

This document is the official guide for writing custom governance providers and rules on the MAD Entertrainment Repository Governance Platform. It explains the core contracts, capabilities negotiation, and references the Git Governance Provider implementation.

---

## 1. Platform Architecture Overview

The platform uses a decoupled provider-and-rule architecture. The core execution engine is a pure coordinator that delegates domain metadata collection and safety rules validation to specialized providers.

```
       [ Core Execution Engine ]
         /                  \
        /                    \
[ Providers ]             [ Rules ]
(e.g., Git)            (e.g., Naming, Stale)
```

- **Providers**: Collect domain-specific metadata (e.g. branch structures, commit histories, package imports, assets).
- **Rules**: Consume metadata and produce findings representing compliance drifts or policy violations.
- **Planner & Writers**: Consume findings to generate action items and markdown summaries.

---

## 2. Core Contracts Reference

All provider developers must implement the frozen contracts defined in [`scripts/governance/platform/contracts/`](file:///Users/admin/Desktop/MAD%20Entertrainment/scripts/governance/platform/contracts/).

### `GovernanceProvider`
Every provider must implement the `GovernanceProvider` interface:
```typescript
export interface GovernanceProvider {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  initialize(context: EngineContext): Promise<void>;
  collectSnapshot(): Promise<DomainSnapshot>;
}
```

### `GovernanceRule`
Rules represent policy checks run against the collected `DomainSnapshot`:
```typescript
export interface GovernanceRule {
  readonly id: string;
  readonly category: RuleCategory;
  readonly severity: Severity;
  readonly tags: string[];

  validate(snapshot: DomainSnapshot, context: EngineContext): Promise<Finding[]>;
}
```

### `Finding`
A finding records a single policy violation with its associated confidence and remediation payload:
```typescript
export interface Finding {
  readonly ruleId: string;
  readonly uniqueId: string; // Globally unique across runs
  readonly message: string;
  readonly severity: Severity;
  readonly confidence: 'PROVEN' | 'HIGH' | 'MEDIUM' | 'LOW';
  readonly metadata: Record<string, any>;
  readonly cleanupAction?: CleanupAction;
}
```

---

## 3. Reference Implementation: Git Governance Provider

The **Git Governance Provider** is the platform's canonical reference implementation. It collects local and remote branch statuses, commit counters, ancestry metrics, and worktree locks.

### Codebase Map
- **Contracts Registration**: Registered under the `git` entry in [`scripts/governance/platform/platform.json`](file:///Users/admin/Desktop/MAD%20Entertrainment/scripts/governance/platform/platform.json).
- **Collector Orchestration**: Orchestrated inside the main run execution block [`scripts/governance/git-audit/run.ts`](file:///Users/admin/Desktop/MAD%20Entertrainment/scripts/governance/git-audit/run.ts).
- **Metadata Collectors**: Located in `git-audit/collectors/` (collects branches, commits, tags, and worktrees).
- **Ancestry Analyzers**: Located in `git-audit/analyzers/` (computes reachability, ancestry, and squash-merge patch equivalence).
- **Lifecycle Classification**: Implemented in the pure `LifecycleClassifier` inside [`scripts/governance/git-audit/utils/lifecycle-classifier.ts`](file:///Users/admin/Desktop/MAD%20Entertrainment/scripts/governance/git-audit/utils/lifecycle-classifier.ts).

---

## 4. Capabilities & Version Negotiation

To prevent runtime errors, the platform executes a version check when loading a provider.
1. The engine reads the provider's `provider.manifest.json` and compares it to the platform's current `platform.json`.
2. The `CapabilityNegotiator` asserts that the provider API version matches the platform's supported API version.
3. Incompatible providers are rejected before any initialization or collection occurs.

---

## 5. Testing Custom Providers & Rules

Custom providers and rules must be validated against the Platform Compatibility Test Suite.
- Create tests in `scripts/governance/platform/testing/`.
- Run tests using vitest:
  ```bash
  pnpm vitest run --project governance
  ```
