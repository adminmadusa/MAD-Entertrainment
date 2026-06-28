---
title: AI Operating System — Accessibility Standards
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# Accessibility Standards

This document records the semantic element rules, screen reader support, and focus constraints.

---

### STD-A11Y-001
* **Rule ID**: STD-A11Y-001
* **Title**: Core Web Vitals Accessibility Audit
* **Description**: Visual interfaces must comply with standard web accessibility checks. Image tags must carry `alt` descriptions, interactive buttons must hold accessible names, and form elements must be linked to HTML labels.
* **Severity**: High
* **Scope**: React client components
* **Rationale**: Missing accessibility landmarks isolates screen reader users and fails build audits.
* **Repository Evidence**: ESLint configurations (`eslint.config.mjs` line 2: importing Next.js core web vitals configurations containing standard a11y plugins).
* **Verification Method**: ESLint check (`pnpm run lint`).
* **Example**:
  ```tsx
  // Avoid: <img src="/logo.png" />
  // Prefer: <img src="/logo.png" alt="MAD Entertrainment Logo" />
  ```
