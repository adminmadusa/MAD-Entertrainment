---
title: AI Operating System — Recovery Specifications
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/runtime/README.md
supersedes: []
---

# Recovery Specifications

* **Module ID**: RUN-RCV-001
* **Purpose**: Registers exception handling playbooks and recovery routines for execution faults.
* **Routines list**:
  - `onTimeout`: abort current execution and release locks.
  - `onCycleDetected`: exit compilation, return error JSON listing trace path.
  - `onContextCorruption`: clear `.agents/ai-os/runtime/cache/` directories, re-run boot bootloader.
