# MAD Entertrainment

- **Owner**: Documentation Owner
- **Status**: Active
- **Version**: 1.0
- **Review Cycle**: Ongoing
- **Last Updated**: 2026-06-25
- **Related Documents:**
  - [REPOSITORY_GOVERNANCE.md](REPOSITORY_GOVERNANCE.md)
  - [AGENTS.MD](AGENTS.MD)
  - [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Overview

This repository contains the MAD Entertrainment platform, including public web experiences, administration tools, booking workflows, ticketing systems, and supporting backend services.

---

## Developer Workflow

Before starting any implementation work:

1. Identify the current active implementation task.
2. Verify no other implementation task is still awaiting:

   * Verification
   * PR Review
   * Merge
   * Branch Cleanup
   * Develop Sync
3. Follow the "one active implementation task" rule.
4. Review `AGENTS.md` before using any AI coding agent.
5. Review `TODO-AUDIT-FIXES.md` for existing backlog items before creating new workstreams.

---

## AI Agent Instructions

All AI coding agents must follow:

* `AGENTS.md`

Agents must not:

* Edit high-risk systems without approval.
* Create commits without approval.
* Push branches without approval.
* Merge branches without approval.
* Delete branches without approval.

High-risk areas include:

* Payment logic
* Authentication logic
* Security logic
* Upload handling
* Database schemas and migrations
* Deployment configuration
* Environment variables
* CI/CD configuration
* Production APIs
* Socket handlers

---

## Testing

Testing guidance is documented in:

* `TESTING.md`

Before opening a PR, run applicable verification commands:

```bash
pnpm lint
pnpm test
pnpm build
```

---

## System Documentation

For detailed information about each subsystem, refer to the respective Single Source of Truth (SSOT) documents:

- [REPOSITORY_GOVERNANCE.md](REPOSITORY_GOVERNANCE.md) — Governance policies, branch/PR standards, and review workflows.
- [ARCHITECTURE.md](ARCHITECTURE.md) — Canonical system architecture, package boundaries, and coding standards.
- [DEPLOYMENT_MAP.md](DEPLOYMENT_MAP.md) — Infrastructure topology, environments, and CI/CD pipelines.
- [API_CONTRACTS.md](API_CONTRACTS.md) — Express endpoint definitions, request/response schemas, and rate limits.
- [docs/decisions/README.md](docs/decisions/README.md) — Architecture Decision Records (ADRs) explaining technical rationale.
- [RUNBOOK.md](RUNBOOK.md) — Operational checklists, deployment instructions, and incident response.
- [TESTING.md](TESTING.md) — Testing guidelines and verification requirements.
- [AGENTS.MD](AGENTS.MD) — Operational instructions for human developers and AI agents.
- [CHANGELOG.md](CHANGELOG.md) — Chronological release history and repository milestones.
- [docs/ROADMAP.md](docs/ROADMAP.md) — Post-launch engineering roadmap and free infrastructure policy.

---

## Governance

Before adding tooling, automation, repository-wide rules, or cleanup processes, review existing governance tooling:

```txt
scripts/ci-governance-check.ts
```

Avoid introducing overlapping governance checks when existing tooling already covers the requirement.

---

## Backlog & Audit Tracking

Repository audit findings, technical debt, governance findings, and future improvements are tracked in:

* [docs/TODO-AUDIT-FIXES.md](docs/TODO-AUDIT-FIXES.md)

Backlog items must not interrupt an active implementation task unless there is a critical production issue.

---

## Branching Strategy

Protected branches:

* `develop`
* `live`

Implementation work must occur on task branches created from `develop`.

Example branch types:

```txt
feat/<task-name>
fix/<task-name>
refactor/<task-name>
test/<task-name>
docs/<task-name>
chore/<task-name>
audit/<task-name>
seo/<task-name>
```

Do not commit directly to protected branches.
