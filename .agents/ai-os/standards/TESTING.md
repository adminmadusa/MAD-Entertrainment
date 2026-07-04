---
title: AI Operating System — Testing Standards
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# Testing Standards

This document registers the testing frameworks, file naming standards, and test runner configurations.

---

### STD-TST-001
* **Rule ID**: STD-TST-001
* **Title**: Testing Toolchain
* **Description**: Unit and integration tests must be written in Vitest. E2E browser tests must be written in Playwright.
* **Severity**: High
* **Scope**: Test suites
* **Rationale**: Maintains a unified, fast testing suite across the monorepo workspace.
* **Repository Evidence**: `package.json` dependencies: `"vitest": "^4.1.7"`, `"@playwright/test": "^1.60.0"`. `vitest.config.ts` and `vitest.workspace.ts` at root.
* **Verification Method**: Test suite execution (`pnpm test`).

---

### STD-TST-002
* **Rule ID**: STD-TST-002
* **Title**: Test File Casing & Qualifiers
* **Description**: Test files must reside alongside the source code and be named with a `.test.ts` or `.test.tsx` qualifier suffix.
* **Severity**: High
* **Scope**: Workspace files
* **Rationale**: Allows Vitest workspace configurations to auto-discover suites.
* **Repository Evidence**: Monorepo conventions (e.g. `refund.service.test.ts`).
* **Verification Method**: Directory scan.
