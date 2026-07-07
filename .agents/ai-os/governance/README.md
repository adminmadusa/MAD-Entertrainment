---
title: AI Operating System — Governance Layer Entry Point
version: 1.0.0
status: active
owner: Repository Governance Owner
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/FOUNDATION.md
supersedes: []
---

# Governance Layer (Operational Governance SSOT)

Welcome to the Governance Layer of the AI Operating System. This layer acts as the canonical Single Source of Truth (SSOT) for operational workflows, review gates, branch lifecycles, and registry validations inside the MAD Entertrainment repository.

Governance rules are defined by process controls (not implementation code) and govern how all other AI OS layers are updated, validated, and approved.

## Directory Inventory

The Governance Layer contains the following documents:
- [README.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/README.md) — This entry point and inventory.
- [AUDIT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/AUDIT.md) — diagnostic audit discovery rules and branch guidelines.
- [CODE_REVIEW.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/CODE_REVIEW.md) — File size checks, orphan preventions, and dead code rules.
- [TESTING.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/TESTING.md) — Pre-merge test runs and quality checkpoints.
- [GIT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/GIT.md) — Task branches lifecycles, commit rules, and branch safety.
- [PULL_REQUEST.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/PULL_REQUEST.md) — Quality gates checklists and branch PR approvals.
- [DEPLOYMENT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/DEPLOYMENT.md) — Environment maps and staging-production backend routing constraints.
- [ADR.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/ADR.md) — Architectural decisions freeze and modification processes.
- [OWNERSHIP.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/OWNERSHIP.md) — Actor roles and resource responsibilities matrix.
- [LIFECYCLE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/LIFECYCLE.md) — Version bumps, layer compatibility matrices, and change management dependency maps.

## Precedence & Dependencies
All files in the Governance Layer are Tier 2 (Governance) artifacts. They depend on `FOUNDATION.md` and Repository Layer files. They govern all other layers (Domain, Architecture, Standards, Patterns, Anti-Patterns, Skills, and Prompts). If a workflow or file change violates these guidelines, the action is blocked, and the repository must be restored to alignment.
