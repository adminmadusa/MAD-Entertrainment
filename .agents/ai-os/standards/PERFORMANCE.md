---
title: AI Operating System — Performance Standards
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# Performance Standards

This document records the caching limits, queue processing rules, and preflight bypass conventions.

---

### STD-PFM-001
* **Rule ID**: STD-PFM-001
* **Title**: Avoid Math.random for IDs
* **Description**: Do not utilize `Math.random` to generate entity identifiers, token strings, or security-sensitive parameters. Use standard `crypto` packages instead.
* **Severity**: High
* **Scope**: TS source files
* **Rationale**: Math.random values are cryptographically insecure and prone to hash collisions under load.
* **Repository Evidence**: ESLint configurations (`eslint.config.mjs` lines 35-41: warning on call expressions matching `Math.random`).
* **Verification Method**: ESLint check (`pnpm run lint`).
* **Example**:
  ```ts
  // Avoid: const id = Math.random().toString();
  // Prefer: const id = crypto.randomUUID();
  ```
