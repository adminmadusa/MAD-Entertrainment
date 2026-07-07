---
title: AI Operating System — Monorepo Tooling & Structure
version: 1.0.0
status: active
owner: Tech Lead
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/repository/README.md
supersedes: []
---

# Monorepo Tooling & Structure

This document outlines the monorepo orchestration tools, build execution flows, and caching configurations in the MAD Entertrainment repository.

## Package Manager
The repository is managed using **pnpm@9.15.0** in a workspace layout. Package installation, override management, and link resolutions are governed by `pnpm-lock.yaml` and workspace declarations.

## Orchestration Tool
Task execution is managed by **Turborepo (turbo)**. Task pipelines, inputs, outputs, and build targets are configured inside `turbo.json`.

### Task Dependencies & Cache
The task pipeline relies on topological dependency sorting:
* **`build`**: Runs compilation. Depends on `^build` (compiling package dependencies first). Caches `.next/**` and `dist/**` directories while excluding Next.js page build caches.
* **`type-check`**: Validates TypeScript types across workspaces. Depends on `^build`.
* **`lint`**: Executes lint rules. Depends on `^build`.
* **`circular-check`**: Analyzes workspaces for circular dependency loops.
* **`dead-code-check`**: Scans for unused exports, components, or modules.
* **`clean`**: Deletes local task compilation caches. This is an uncached command.
* **`dev`**: Starts interactive development environments. This is a non-caching, persistent process.

## Root Execution Scripts
Scripts defined in the root `package.json` manage overall tasks:
* `npm run dev`: Cleanup ports using `scripts/cleanup-ports.js` and spin up workspaces in parallel (`turbo dev`).
* `npm run build`: Compile all targets (`turbo build`).
* `npm run type-check`: Verify types (`turbo type-check`).
* `npm run lint`: Run lint checks (`turbo lint`).
* `npm run test`: Run the test suite via Vitest (`vitest run`).
* `npm run clean`: Purge build targets, node_modules, and cache files (`turbo clean`).
* `npm run audit-data`: Collect active Express server routes and details into `audit_data.json` via `scripts/gather_audit_data.ts`.
* `npm run governance:docs`: Run the governance build checks.
