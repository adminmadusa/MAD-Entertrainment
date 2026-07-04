---
title: AI Operating System — Implementation Plan Prompt
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/prompts/README.md
supersedes: []
---

# Implementation Plan Prompt

* **Prompt ID**: PRM-PLN-001
* **Purpose**: Guides pre-implementation research and outputs the mandatory design blueprint document for user review.
* **Use Cases**: Before initiating any code modifications or git commits.
* **Preconditions**: Issue description is registered and task branch is checked out.
* **Required AI OS Layers**: Architecture (Decisions), Standards (Documentation).
* **Required Core Skills**: `architecture-review`.
* **Required Project Skills**: `repository-governance`.
* **Required Validators**: `VAL-ARC-001`, `VAL-DOC-001`.
* **Required Governance Rules**: `ADR.md`, `DOCUMENTATION.md`.
* **Expected Deliverables**: `implementation_plan.md` artifact.
* **Human Review Requirements**: User review and explicit approval (Feedback Requested = true).
* **Failure Conditions**: Design cannot proceed if it introduces circular references or duplicates existing services.
* **Confidence Requirements**: 1.0.
