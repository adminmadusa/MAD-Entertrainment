---
title: AI Operating System — React Coding Standards
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# React Coding Standards

This document records the component structure rules and hydration safety guidelines for React 19.

---

### STD-REC-001
* **Rule ID**: STD-REC-001
* **Title**: Hydration Safety Guards
* **Description**: Browser-only globals (like `window`, `document`, `localStorage`) must not be accessed directly during render. They must be guarded using the `useMounted()` hook or `useWindowWidth()` wrapper.
* **Severity**: High
* **Scope**: React client components
* **Rationale**: Direct access to browser-only globals during server rendering causes hydration mismatch errors.
* **Repository Evidence**: ESLint configurations (`eslint.config.mjs` lines 14-18: `'no-restricted-globals': 'off'` is disabled to allow guarded checks; `useMounted` is the standard project hook).
* **Verification Method**: Manual code review and hydration mismatch log checks.
* **Example**:
  ```tsx
  const isMounted = useMounted();
  const width = isMounted ? window.innerWidth : 0;
  ```

---

### STD-REC-002
* **Rule ID**: STD-REC-002
* **Title**: Restricted DangerouslySetInnerHTML
* **Description**: Use of `dangerouslySetInnerHTML` is restricted and warns in the linter.
* **Severity**: High
* **Scope**: React components
* **Rationale**: Raw HTML insertion opens security vulnerabilities (Cross-Site Scripting).
* **Repository Evidence**: ESLint configurations (`eslint.config.mjs` line 29: `'react/no-danger': 'warn'`).
* **Verification Method**: ESLint check (`pnpm run lint`).
* **Exceptions**: Rendering sanitised customer markdown text.
