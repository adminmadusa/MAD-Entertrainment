---
title: AI Operating System — Repository Layer Entry Point
version: 1.0.0
status: active
owner: Tech Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/FOUNDATION.md
supersedes: []
---

# Repository Layer

Welcome to the Repository Layer of the AI Operating System. This layer describes the physical structure, build orchestrations, workspaces, dependency constraints, and directory ownership of the MAD Entertrainment monorepo. 

This layer serves to explain **how the repository is organized**, not **how the business works**.

## Directory Inventory

The Repository Layer contains the following documents:
- [README.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/repository/README.md) — This entry point and inventory.
- [MONOREPO.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/repository/MONOREPO.md) — Overview of monorepo structure, build workflows, and toolchain configurations.
- [WORKSPACES.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/repository/WORKSPACES.md) — Configuration mapping for pnpm workspaces.
- [APPLICATIONS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/repository/APPLICATIONS.md) — Architectural role and constraints of the workspace applications.
- [PACKAGES.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/repository/PACKAGES.md) — Descriptions and roles of shared packages in the monorepo.
- [OWNERSHIP.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/repository/OWNERSHIP.md) — Directory-level ownership map for review routing.
- [IMPORT_RULES.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/repository/IMPORT_RULES.md) — Path mappings and aliasing policies.
- [DEPENDENCY_RULES.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/repository/DEPENDENCY_RULES.md) — Third-party library rules and dependency version locking.
- [NAMING.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/repository/NAMING.md) — Folder and file naming conventions.
- [DEPLOYMENT_MAP.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/repository/DEPLOYMENT_MAP.md) — Environment matrix and infrastructure topology overview.

## Precedence & Dependencies
All files in the Repository Layer are Tier 1 (Repository) artifacts. They depend on `FOUNDATION.md` and are referenced by higher layers (Domain, Architecture, Standards, etc.). If a codebase file configuration contradicts these documentation files, the code configuration is the Single Source of Truth, and these documents must be updated to align.
