---
title: AI Operating System — Version Registry
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/FOUNDATION.md
supersedes: []
---

# AI Operating System — Version Registry

## System Status
* **Current Version**: 1.0.0 (Phase 1 Baseline)
* **Release Date**: 2026-06-28
* **Status**: Active
* **Supported Architecture Version**: 2.0.0
* **Supported ADR Pack**: 1.0.0

## Compatibility Matrix
This matrix details the compatibility requirements between the AI OS layers.

| Layer A | Layer B | Compatibility Rule |
|---------|---------|---------------------|
| Prompts | Skills | MAJOR versions must match. A prompt referencing `v1.x` skills is incompatible with `v2.x` skills. |
| Skills | Domain | Skills must conform to Domain lifecycle states and rules. A MAJOR bump in Domain rules requires re-auditing all dependent skills. |
| Skills | Standards | Skills must align with the conventions outlined in coding standards. Standard changes trigger non-blocking audits. |
| Prompts | Templates | Templates used by prompts must align on the same MAJOR version. |
| All Layers | FOUNDATION | Any MAJOR change to FOUNDATION.md requires re-evaluation of governance and standards. |

## Change Policy & Versioning Rules
The AI Operating System utilizes strict Semantic Versioning (`MAJOR.MINOR.PATCH`) to track baseline states:
1. **MAJOR version bumps** are triggered by breaking changes in layer configurations, contract interfaces, or principles.
2. **MINOR version bumps** are triggered by additive features, new standards, or new skills that do not break existing downstream compatibility.
3. **PATCH version bumps** are triggered by formatting corrections, documentation clarifications, or minor bugs in validation script logic.

Any change to version registries must be validated and recorded in `CHANGELOG.md`.
