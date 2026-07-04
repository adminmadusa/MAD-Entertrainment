---
title: AI Operating System — Pre-Implementation Audit Prompt
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/prompts/README.md
supersedes: []
---

# Pre-Implementation Audit Prompt

* **Prompt ID**: PRM-GOV-001
* **Purpose**: Enforces verification gates before edits are permitted, requiring details on git status, branches, and risks.
* **Use Cases**: Task branch startup, audit verification before coding begins.
* **Preconditions**: Issue ticket has been assigned and workspace is checked out.
* **Required AI OS Layers**: Governance (Audit, Git).
* **Required Core Skills**: None.
* **Required Project Skills**: `repository-governance`.
* **Required Validators**: `VAL-GOV-001`, `VAL-GOV-002`.
* **Required Governance Rules**: `AUDIT.md`, `GIT.md`.
* **Expected Deliverables**: Pre-implementation audit approval log.
* **Human Review Requirements**: Stop and wait for explicit confirmationcontaining: `Approved to edit: <file>`.
* **Failure Conditions**: Coding tasks block if approval token is missing.
* **Confidence Requirements**: 1.0.
