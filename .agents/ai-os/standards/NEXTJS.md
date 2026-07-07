---
title: AI Operating System — Next.js Coding Standards
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# Next.js Coding Standards

This document outlines the directory structure, routing, and data-fetching rules for Next.js 15.

---

### STD-NXT-001
* **Rule ID**: STD-NXT-001
* **Title**: Hard Reload HTML Links in Error Boundaries
* **Description**: standard Next.js navigation must use `<Link>`. However, inside Error Boundaries, native HTML `<a>` tags are permitted to enforce hard reload behavior when recovering from crashes.
* **Severity**: Medium
* **Scope**: Error boundary layout files (`error.tsx`, `global-error.tsx`)
* **Rationale**: Next.js `<Link>` performs soft client-side transitions, which does not clear corrupted layout states during client-side crashes.
* **Repository Evidence**: ESLint configurations (`eslint.config.mjs` line 25: `'@next/next/no-html-link-for-pages': 'off'`).
* **Verification Method**: Code review.
* **Example**:
  ```tsx
  // Inside error.tsx
  <a href="/dashboard" className="button">Reload Dashboard</a>
  ```
