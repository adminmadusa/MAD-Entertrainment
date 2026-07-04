---
title: AI Operating System — Prompt Registry
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/prompts/README.md
supersedes: []
---

# Prompt Registry

This document lists the active prompts registered in the AI Operating System.

---

## 1. Prompt Catalog Registry

| Prompt ID | Version | Status | Owner | Required AI OS Layers | Required Skills | Required Validators |
|-----------|---------|--------|-------|------------------------|-----------------|---------------------|
| **PRM-AUD-001** (repository-audit) | 1.0.0 | active | Principal AI Systems Architect | Repository, Standards | `naming-audit` | `VAL-NAM-001`, `VAL-NAM-002` |
| **PRM-IMP-001** (bug-fix) | 1.0.0 | active | Principal AI Systems Architect | Standards (Testing) | `typescript-audit` | `VAL-TST-001`, `VAL-TS-001` |
| **PRM-PLN-001** (implementation-plan) | 1.0.0 | active | Principal AI Systems Architect | Architecture, Standards | `architecture-review` | `VAL-ARC-001`, `VAL-DOC-001` |
| **PRM-REV-001** (code-review) | 1.0.0 | active | Principal AI Systems Architect | Governance, Standards | `react-audit` | `VAL-REC-001`, `VAL-REC-002` |
| **PRM-GOV-001** (pre-implementation-audit) | 1.0.0 | active | Principal AI Systems Architect | Governance (Audit, Git) | `repository-governance` | `VAL-GOV-001`, `VAL-GOV-002` |

---

## 2. Prompt Dependency Graph
Prompts orchestrate skills and validators. They must be executed before code changes are made to guarantee compliance with local repository governance gates.
