---
title: AI Operating System — Repository Audit Prompt
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/prompts/README.md
supersedes: []
---

# Repository Audit Prompt

* **Prompt ID**: PRM-AUD-001
* **Purpose**: Orchestrates codebase static scans to identify naming deviations and generic folders.
* **Use Cases**: Periodic code quality audits, pre-PR staging checks.
* **Preconditions**: Target files are staged or listed inside workspaces.
* **Required AI OS Layers**: Repository, Standards (Naming).
* **Required Core Skills**: `naming-audit`.
* **Required Project Skills**: `repository-governance`.
* **Required Validators**: `VAL-NAM-001`, `VAL-NAM-002`.
* **Required Governance Rules**: `GIT.md`, `CODE_REVIEW.md`.
* **Expected Deliverables**: Naming audit report.
* **Human Review Requirements**: None (auto-rejected on critical/high naming violations).
* **Failure Conditions**: Scans block if path names parameters parse invalid formats.
* **Confidence Requirements**: 1.0 (exact regex verification).
