---
title: AI Operating System — Workspace Declarations
version: 1.0.0
status: active
owner: Tech Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/repository/README.md
supersedes: []
---

# Workspace Declarations

This document registers the packages and workspace directories configured in the MAD Entertrainment repository.

## Workspace Configuration
The workspaces are declared inside `pnpm-workspace.yaml` under the following glob patterns:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

## Workspace Index

| Workspace Directory | Package Name | Workspace Class | Purpose |
|---------------------|--------------|-----------------|---------|
| `apps/web` | `@mad/web` | Application | Customer ticket booking portal (Next.js) |
| `apps/admin` | `@mad/admin` | Application | Operator management control panel (Next.js) |
| `apps/server` | `@mad/server` | Application | Stateful backend core API server and worker hub (Express) |
| `packages/shared` | `@mad/shared` | Library | Reusable configuration models, assets, and base constants |
| `packages/types` | `@mad/types` | Library | Common TypeScript model interfaces and type structures |
| `packages/ui` | `@mad/ui` | Library | Shared component library containing style primitives |
| `packages/utils` | `@mad/utils` | Library | Shared core utility functions |
| `packages/validations` | `@mad/validations` | Library | Shared schema validation rules powered by Zod |

## Package Dependency Resolution
Inter-workspace linking utilizes the `workspace:*` version resolution protocol inside each `package.json` to ensure dependency alignment and prevent duplication:
- Changes in library code (e.g. `@mad/shared`, `@mad/validations`) compile during building and are consumed by dependants immediately.
- Library compilation outputs default to `dist/index.js` and `dist/index.d.ts`.
