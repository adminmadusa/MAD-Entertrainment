---
title: AI Operating System — Session Specifications
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/runtime/README.md
supersedes: []
---

# Session Specifications

* **Module ID**: RUN-SES-001
* **Purpose**: Coordinates active task session parameter logs and state tracking variables.
* **Session Metadata keys**:
  - `sessionId`: unique string token.
  - `taskId`: issue identifier.
  - `activeBranch`: current branch string.
  - `timestampStart`: start date.
