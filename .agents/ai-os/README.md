---
title: AI Operating System — Entry Point
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on: []
supersedes: []
---

# AI Operating System (AI OS)

Welcome to the **MAD Entertrainment AI Operating System (AI OS)**. This directory is the single source of truth for the project's knowledge system. It exists to orient AI agents and human engineers alike, ensuring that AI-assisted code generation remains correct, consistent, traceable, and maintainable.

## Purpose
The AI OS acts as an engineering contract and capability engine. By establishing rigid boundaries, dependency rules, standards, and enforcements, it ensures AI agents produce output conforming exactly to the monorepo's architectural patterns and business domains without introducing technical debt or duplicate logic.

## Quick Start
If you are an AI agent, you must strictly follow the **Mandatory Reading Order** before performing any operations in the codebase.
If you are a human engineer, review the directory overview below and refer to the foundational documents linked under the navigation directory.

## Current System Status
* **Current Phase**: Phase 1 (Foundation)
* **Current Version**: 1.0.0 (Refer to [VERSION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/VERSION.md))
* **Implementation State**: Foundation layer initialized. Subsequent layers (Repository, Domain, Architecture, Standards, Governance, Schemas, etc.) are planned for implementation.

## Foundational Documents
- [FOUNDATION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/FOUNDATION.md) — The system constitution outlining identity, core principles, system boundaries, and operating rules.
- [INDEX.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/INDEX.md) — The master navigation index where all current and future artifacts are registered.
- [VERSION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/VERSION.md) — Version registry and layer compatibility matrix.
- [CHANGELOG.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/CHANGELOG.md) — Artifact release history.

## Directory Overview
Every file in the AI OS is structured into explicit, top-down layers:
* `foundation/` (at root level) — Identity, principles, and rules.
* `repository/` *(Planned)* — codebase geography, packages, and environment maps.
* `domain/` *(Planned)* — core business domains (bookings, auth, payments, tickets, etc.).
* `architecture/` *(Planned)* — Architecture Decision Records (ADRs) and interface contracts.
* `standards/` *(Planned)* — technology coding standards, patterns, and anti-patterns.
* `governance/` *(Planned)* — process ownership, review matrices, and change policies.
* `validation/` *(Planned)* — schema files and CI scripts enforcing compliance.
* `skills/` *(Planned)* — stateless AI capability definitions.
* `prompts/` *(Planned)* — task-specific instructions orchestrating skills.
* `templates/` *(Planned)* — boilerplate configurations and structures.
* `knowledge/` *(Planned)* — non-authoritative Knowledge Items (KIs) from past investigations.
* `runtime/` *(Planned, gitignored)* — vector indexes and session memory.

## AI Agent Mandatory Reading Order
Before executing tasks in this monorepo, AI agents must read these files in order:
1. [FOUNDATION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/FOUNDATION.md) — orientation & constitution.
2. `repository/map.md` *(Planned)* — monorepo geography.
3. `repository/packages.md` *(Planned)* — packages context.
4. `domain/<affected-domain>/lifecycle.md` *(Planned)* — state lifecycle.
5. `domain/<affected-domain>/rules.md` *(Planned)* — domain business rules.
6. `standards/<relevant-technology>/` *(Planned)* — coding standards.
7. `architecture/decisions/` *(Planned)* — relevant ADRs.

## Future Evolution
Future implementation phases will proceed sequentially according to the [AI_OS_Phase1_Implementation_Baseline.md](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_Phase1_Implementation_Baseline.md). The validation scripts built in Phase 8 will automatically enforce this entire structure via `pnpm run validate-ai`.
