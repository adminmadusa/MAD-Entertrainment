---
title: AI Operating System — Knowledge Registry
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/knowledge/README.md
supersedes: []
---

# Knowledge Registry

This document lists the active non-authoritative references registered in the Knowledge Layer.

---

## 1. Reference Catalog Registry

| Ref ID | Category | Owner | Status | Update Frequency | Related Standards | Related Patterns |
|--------|----------|-------|--------|------------------|-------------------|------------------|
| **REF-FRM-001** (react) | frameworks | Principal AI Systems Architect | active | Bi-yearly | `REACT.md` | `HYDRATION_SAFETY.md` |
| **REF-FRM-002** (nextjs) | frameworks | Principal AI Systems Architect | active | Bi-yearly | `NEXTJS.md` | `ERROR_RECOVERY.md` |
| **REF-LIB-001** (mongoose) | libraries | Principal AI Systems Architect | active | Bi-yearly | `DATABASE.md` | `TRANSACTION.md` |
| **REF-INF-001** (vercel) | infrastructure | Principal AI Systems Architect | active | Bi-yearly | `DEPLOYMENT.md` | `ENV_VALIDATION.md` |
| **REF-VEN-001** (stripe) | vendors | Principal AI Systems Architect | active | Bi-yearly | `SECURITY.md` | `MOCK_PAYMENT_LOCK.md` |
| **REF-TRB-001** (connections) | troubleshooting | Principal AI Systems Architect | active | Quarterly | `ERROR_HANDLING.md`| None |
| **REF-MIG-001** (next-upgrade) | migration-guides | Principal AI Systems Architect | active | Yearly | `NEXTJS.md` | None |
| **REF-BST-001** (clean-code) | best-practices | Principal AI Systems Architect | active | Yearly | `NAMING_CONVENTIONS.md` | None |
| **REF-PLY-001** (deploy-recovery) | playbooks | Principal AI Systems Architect | active | Quarterly | `CI_CD.md` | None |

---

## 2. Cross-Layer Validation Rules
These references are purely descriptive. They must be validated to ensure they contain **zero business rules** or repository-specific setups.
