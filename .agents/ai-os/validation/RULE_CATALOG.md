---
title: AI Operating System — Rule Catalog
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/README.md
supersedes: []
---

# Rule Catalog

This document defines the classification standards and severity models used by all validators.

---

## 1. Severity Classification

Every validator finding must assign one of the following severity levels:

* **CRITICAL**:
  - *Definition*: Triggers build failure, financial leakages, security exploits, or direct transaction bypasses.
  - *PR Action*: Blocks merge automatically. Requires immediate hotfix.
* **HIGH**:
  - *Definition*: Triggers runtime hydration errors, compilation issues, or breaks core state machines.
  - *PR Action*: Blocks merge automatically.
* **MEDIUM**:
  - *Definition*: Code smells, styling deviations, lack of documentation metadata, or warnings.
  - *PR Action*: Requires review. Merges are allowed with reviewer approval.
* **LOW**:
  - *Definition*: Minor formatting hints, non-critical comments.
  - *PR Action*: Does not block merges.

---

## 2. Confidence Score Metric

To prevent alerting fatigue, findings must specify a confidence level:

* **1.0 (Absolute)**: Direct AST compiler match or ESLint syntax error. Zero false positive risk.
* **0.8 (High)**: Code heuristic match mapping specific pattern files. Low false positive risk.
* **0.5 (Medium)**: Contextual checking (e.g. looking for orphan components). Requires human code review to confirm.
