---
title: AI Operating System — Context Loading Specifications
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/runtime/README.md
supersedes: []
---

# Context Loading Specifications

* **Module ID**: RUN-CTX-001
* **Purpose**: Outlines parameters for resolving active repository branch name, task targets, and env properties.
* **Context Schema**:
  - `requiredContext`: Git branch namespaces (feat/fix/etc.), local build status.
  - `optionalContext`: Staging URL config parameters.
  - `invalidContext`: Disallowed folders (temp/old/backup), dirty git workspace status.
