---
title: AI Operating System — TypeScript Coding Standards
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# TypeScript Coding Standards

This document registers the coding rules, compiler options, and type safety constraints enforced across the TypeScript codebase.

---

### STD-TS-001
* **Rule ID**: STD-TS-001
* **Title**: Avoid no-explicit-any
* **Description**: The use of `any` types is restricted. Any usage must carry documented justification.
* **Severity**: High
* **Scope**: TS source files
* **Rationale**: Bypassing type safety leads to runtime crashes and increases AI logic errors.
* **Repository Evidence**: ESLint configurations (`eslint.config.mjs` line 33: `'@typescript-eslint/no-explicit-any': 'warn'`).
* **Verification Method**: ESLint check (`pnpm run lint`).
* **Exceptions**: Parsing unknown external APIs before schema mapping.

---

### STD-TS-002
* **Rule ID**: STD-TS-002
* **Title**: Restricted TS-Ignore Comments
* **Description**: Compiler directive comments (e.g. `@ts-ignore`) are restricted and warn in linter tasks.
* **Severity**: Medium
* **Scope**: TS source files
* **Rationale**: Directives hide compilation errors that trigger production failures.
* **Repository Evidence**: ESLint configurations (`eslint.config.mjs` line 34: `'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }]`).
* **Verification Method**: ESLint check (`pnpm run lint`).
* **Exceptions**: Resolving issues with untyped third-party libraries.
* **Example**: Avoid using `@ts-ignore` to silence type-checking errors.
