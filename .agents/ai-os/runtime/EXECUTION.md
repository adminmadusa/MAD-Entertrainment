---
title: AI Operating System — Execution Lifecycle Specifications
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/runtime/README.md
supersedes: []
---

# Execution Lifecycle Specifications

* **Module ID**: RUN-EXE-001
* **Purpose**: Coordinates prompt execution pipelines and skill invocations sequence.
* **Lifecycle hooks**:
  - `preExecute`: Validate input context keys schemas.
  - `onExecute`: Run skill script or task operations.
  - `postExecute`: Trigger validations checks on results.
