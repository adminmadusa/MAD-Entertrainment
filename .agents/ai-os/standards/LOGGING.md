---
title: AI Operating System — Logging Standards
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# Logging Standards

This document records the logger choices, level conventions, and context metadata rules.

---

### STD-LOG-001
* **Rule ID**: STD-LOG-001
* **Title**: Use Structured Pino Logger
* **Description**: Backend logs must use the global `logger` client (Pino). Plain console.log statements are blocked or warn in linter checks.
* **Severity**: High
* **Scope**: Express source files
* **Rationale**: Pino prints structured JSON outputs which are required by automated log collectors in production.
* **Repository Evidence**: `eslint.config.mjs` line 31: `'no-console': ['warn', { allow: ['warn', 'error'] }]`. Pino configuration in `apps/server/src/utils/logger.ts`.
* **Verification Method**: ESLint check (`pnpm run lint`).
* **Example**:
  ```ts
  logger.info({ email: normalizedEmail }, "OTP passcode requested");
  ```
