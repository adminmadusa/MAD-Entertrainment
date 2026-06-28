---
title: AI Operating System — Shared Workspace Packages
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

# Shared Workspace Packages

This document registers and describes the role, internal dependencies, and scope of the shared libraries located in the `packages/` directory of the monorepo.

---

## 1. @mad/shared
* **Directory**: `packages/shared`
* **Role**: Primary base configurations and shared runtime models (such as site enums, assets, and base system constants).
* **Dependencies**: None.
* **Build Command**: `rm -rf dist tsconfig.tsbuildinfo && tsc -p tsconfig.json`

---

## 2. @mad/types
* **Directory**: `packages/types`
* **Role**: Shared TypeScript interface models and domain entity structures used to ensure typing consistency across frontends and backends.
* **Dependencies**:
  - `@mad/shared`
* **Build Command**: `rm -rf dist tsconfig.tsbuildinfo && tsc -p tsconfig.json`

---

## 3. @mad/ui
* **Directory**: `packages/ui`
* **Role**: Shared component library containing visual interface primitives (such as dialog modals, custom inputs, select elements) built with React 19.
* **Dependencies**:
  - `react` (^19.0.0)
* **Build Command**: `rm -rf dist tsconfig.tsbuildinfo && tsc -p tsconfig.json`

---

## 4. @mad/utils
* **Directory**: `packages/utils`
* **Role**: Shared TypeScript utility functions (such as dates, currency formatting, object manipulations, token handlers).
* **Dependencies**:
  - `@mad/types`
* **Build Command**: `rm -rf dist tsconfig.tsbuildinfo && tsc -p tsconfig.json`

---

## 5. @mad/validations
* **Directory**: `packages/validations`
* **Role**: Shared validation rules powered by Zod. Express APIs and Next.js frontends alike import these schemas to enforce payloads and prevent validation skew.
* **Dependencies**:
  - `zod` (^3.25.76)
* **Build Command**: `rm -rf dist tsconfig.tsbuildinfo && tsc -p tsconfig.json`
