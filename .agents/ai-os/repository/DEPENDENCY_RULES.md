---
title: AI Operating System — Third-Party Dependency Policies
version: 1.0.0
status: active
owner: Tech Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/repository/README.md
  - .agents/ai-os/repository/WORKSPACES.md
supersedes: []
---

# Third-Party Dependency Policies

This document records the rules, dependency overrides, and package dependency structures enforced in the MAD Entertrainment repository.

## Dependency Overrides
To prevent package duplicates and resolve compatibility clashes, global overrides are declared in the root `package.json`:
* **`esbuild`**: Locked at version `0.28.0`.
* **`ws`**: Locked at version `^8.21.0`.

## Library Workspace Constraints
Shared workspace packages must maintain minimal dependency profiles to prevent bundle bloating and dependency loops:
* **`@mad/shared`**: No third-party or workspace dependencies.
* **`@mad/types`**: Depends only on `@mad/shared`.
* **`@mad/validations`**: Depends only on `zod`.
* **`@mad/ui`**: Depends only on `react`.
* **`@mad/utils`**: Depends only on `@mad/types`.

## Workspace Package Constraints
1. **Workspace Protocol**: Inter-workspace library packages must resolve using the `workspace:*` specifier in `package.json` configurations.
2. **Exemption Audits**: Any new third-party dependency added must be scanned for vulnerabilities and recorded using `.audit-exceptions.json` exceptions if required.
3. **No Direct UI Imports**: Core styling and visual components should reside inside `@mad/ui` rather than being copied or independently written inside client-facing application layouts.
