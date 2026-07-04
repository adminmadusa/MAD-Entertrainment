---
name: "governance-audit"
description: "Audit repository compliance rules, file sizes, warnings ratchets, and manage the governance engine codebase (validators, fixers, rollbacks, sessions, analytics)."
version: "1.1"
owner: "Principal Software Architect"
last_updated: "2026-07-03"
depends_on: "None"
supersedes: "None"
scope: "Governance"
priority: "Core"
---

# Governance Audit & Development Skill

## Purpose
Enforce the static and dynamic verification gates of the repository, and guide modifications to the governance framework itself (validators, fixers, rollbacks, sessions, analytics).

## Trigger Keywords
governance, validator, fixer, lifecycle, rollback, findings, analytics, persistence, rule metadata, audit engine, warnings ratchet, gating evaluation.

## Prerequisites
- Repository audit completed.
- Existing findings database checked.
- Code duplication checks performed.
- Reuse opportunities identified first.

## Boundaries
- **When to Use**:
  - Before committing files or opening a PR.
  - When writing new validator rules under `scripts/governance/rules/`.
  - When extending or modifying `AutoFixEngine`, `RollbackManager`, `SessionStore`, or `AnalyticsEngine`.
- **When NOT to Use**:
  - For general repository architecture decisions.
  - For frontend UI styling or layout creation.
  - For general client/server application feature implementation.

## Reuse Policy
Before proposing a new validator, fixer, workflow, or utility:
- Search for existing implementations first.
- Extend existing capabilities where appropriate.
- Do not create duplicate abstractions.
- Explain why a new component is required if reuse is not possible.

## Skill Relationships
Primary:
- pr-review
Collaborates with:
- architecture-review
Does Not Replace:
- ci-investigation
- documentation

## Related Rules
- Refer to [AGENTS.MD](../../../AGENTS.MD) for quality checklists, PR gates, and static warning ratchets.
