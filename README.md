# MAD Entertrainment

- **Owner**: Documentation Owner
- **Status**: Active
- **Version**: 1.1
- **Review Cycle**: Ongoing
- **Last Updated**: 2026-11-19
- **Related Documents:**
  - [REPOSITORY_GOVERNANCE.md](REPOSITORY_GOVERNANCE.md)
  - [AGENTS.md](AGENTS.md)
  - [Governance Rules](docs/governance/RULES.md)

---

## Overview

This repository contains the MAD Entertrainment platform, including public web experiences, administration tools, booking workflows, ticketing systems, and supporting backend services.

---

## Getting Started & Contributing

### 1. Prerequisites & Setup
Ensure your local workstation has the correct tooling:
- **Node.js**: `v20.x.x` (LTS)
- **Package Manager**: `pnpm@9.15.0`

```bash
# Clone the repository
git clone https://github.com/adminmadusa/MAD-Entertrainment.git
cd MAD-Entertrainment

# Install workspace dependencies
pnpm install --frozen-lockfile
```

### 2. Developer Workflow (The One Task Rule)
Before starting any implementation work:
1. Identify the current active implementation task.
2. Verify no other implementation task is still awaiting verification, PR review, merge, branch cleanup, or develop sync.
3. Follow the "one active implementation task" rule — only one active task branch at a time.
4. Review `AGENTS.md` before using any AI coding agent.

### 3. Branching Strategy
Protected branches:
- `develop`
- `live`

Implementation work must occur on task branches created from `develop`:
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

---

## AI Agent Instructions

All AI coding agents must follow [AGENTS.md](AGENTS.md). Agents must not edit high-risk systems, create commits, push branches, or merge without explicit approval.

High-risk areas include:
- Payment logic
- Authentication logic
- Security logic
- Upload handling
- Database schemas and migrations
- Deployment configuration
- Environment variables
- CI/CD configuration
- Production APIs
- Socket handlers

---

## Testing & Verification

Testing guidance is documented in [TESTING.md](TESTING.md).

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
- [AGENTS.md](AGENTS.md) — Operational instructions for human developers and AI agents.
- [CHANGELOG.md](CHANGELOG.md) — Chronological release history and repository milestones.
- [docs/governance/RULES.md](docs/governance/RULES.md) — Governance rules and static analysis policy.
- [docs/governance/ENGINE.md](docs/governance/ENGINE.md) — Governance engine architecture.
- [packages/ui/README.md](packages/ui/README.md) — Shared UI component library and design primitives catalog.
- [openspec/SPECS.md](openspec/SPECS.md) — Active capability specifications and change management proposals.

---

## Governance

Before adding tooling, automation, repository-wide rules, or cleanup processes, review existing governance tooling under `scripts/governance/`.
