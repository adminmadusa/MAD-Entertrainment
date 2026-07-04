---
title: AI Operating System — Code Review Prompt
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/prompts/README.md
supersedes: []
---

# Code Review Prompt

* **Prompt ID**: PRM-REV-001
* **Purpose**: Orchestrates codebase static sweeps during review tasks to ban unused references and enforce file complexity line constraints.
* **Use Cases**: Pre-commit linting checks, pull request reviewer sweeps.
* **Preconditions**: Code file has been modified.
* **Required AI OS Layers**: Governance (Code Review), Standards (React).
* **Required Core Skills**: `react-audit`.
* **Required Project Skills**: `repository-governance`.
* **Required Validators**: `VAL-REC-001`, `VAL-REC-002`.
* **Required Governance Rules**: `CODE_REVIEW.md`.
* **Expected Deliverables**: Review findings catalog JSON.
* **Human Review Requirements**: Mismatches detected outside rendering paths can be dismissed if confirmed safe.
* **Failure Conditions**: Scans block if targets fail compile checks.
* **Confidence Requirements**: 0.8.
