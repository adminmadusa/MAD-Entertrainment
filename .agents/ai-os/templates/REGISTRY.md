---
title: AI Operating System — Templates Registry
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/templates/README.md
supersedes: []
---

# Templates Registry

This document lists the active templates registered in the AI Operating System.

---

## 1. Template Catalog Registry

| Template ID | Version | Status | Owner | Required AI OS Layers | Prompts Consumer | Validation Mappings |
|-------------|---------|--------|-------|-----------------------|------------------|---------------------|
| **TMP-AUD-001** (repository-audit-report) | 1.0.0 | active | Principal AI Systems Architect | Repository, Standards | `repository-audit` | `VAL-NAM-001`, `VAL-NAM-002` |
| **TMP-PLN-001** (implementation-plan) | 1.0.0 | active | Principal AI Systems Architect | Architecture, Standards | `implementation-plan` | `VAL-ARC-001`, `VAL-DOC-001` |
| **TMP-IMP-001** (bug-fix-report) | 1.0.0 | active | Principal AI Systems Architect | Standards (Testing) | `bug-fix` | `VAL-TST-001`, `VAL-TS-001` |
| **TMP-GOV-001** (pre-implementation-report) | 1.0.0 | active | Principal AI Systems Architect | Governance (Audit, Git) | `pre-implementation-audit` | `VAL-GOV-001`, `VAL-GOV-002` |
| **TMP-DOC-001** (adr) | 1.0.0 | active | Principal AI Systems Architect | Architecture (Decisions) | `adr-generator` | `VAL-DOC-001`, `VAL-DOC-002` |

---

## 2. Template Mappings Graph
Templates are presentation schemas. They define structural sections, keys, and headings, ensuring output format uniformity for automated CI and PR sweeps.
