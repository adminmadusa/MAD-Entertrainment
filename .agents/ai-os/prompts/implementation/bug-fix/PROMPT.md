---
title: AI Operating System — Bug Fix Prompt
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/prompts/README.md
supersedes: []
---

# Bug Fix Prompt

* **Prompt ID**: PRM-IMP-001
* **Purpose**: Orchestrates bug-fixing workflows ensuring local testing suites validation and strong typing bounds.
* **Use Cases**: Resolving reported codebase issues.
* **Preconditions**: Staging environment bug is reproducible on current task branch.
* **Required AI OS Layers**: Standards (Testing, TypeScript).
* **Required Core Skills**: `typescript-audit`.
* **Required Project Skills**: `authentication-audit`, `booking-audit`, `payment-audit`.
* **Required Validators**: `VAL-TST-001`, `VAL-TS-001`.
* **Required Governance Rules**: `TESTING.md`, `CODE_REVIEW.md`.
* **Expected Deliverables**: Modified source code files and passing test run logs.
* **Human Review Requirements**: Changes affecting payment, auth, or DB logic require senior engineer approval.
* **Failure Conditions**: Commits block if local tests fail compile-checks.
* **Confidence Requirements**: 1.0.
