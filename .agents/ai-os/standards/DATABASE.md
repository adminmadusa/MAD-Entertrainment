---
title: AI Operating System — Database Standards
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# Database Standards

This document records the ODM configurations, transaction boundaries, and indexing rules for MongoDB/Mongoose.

---

### STD-DB-001
* **Rule ID**: STD-DB-001
* **Title**: Transaction Isolation wrapper
* **Description**: Writes mutating multiple collections (e.g. confirming a booking and creating tickets) must run inside the `runInTransaction` wrapper.
* **Severity**: High
* **Scope**: Express service files
* **Rationale**: Guarantees atomic database writes. Partial updates trigger inventory leakage and billing discrepancies.
* **Repository Evidence**: `apps/server/src/utils/transaction.ts` and usages in `apps/server/src/services/public/booking.service.ts`.
* **Verification Method**: Test suite execution (`pnpm test`).

---

### STD-DB-002
* **Rule ID**: STD-DB-002
* **Title**: Disable AutoIndex in Production
* **Description**: Mongoose schemas must disable auto-indexing (`autoIndex: false`) when running in production modes.
* **Severity**: High
* **Scope**: Mongoose schema files
* **Rationale**: Auto-indexing on application startup blocks database threads and degrades response times during scaling.
* **Repository Evidence**: Mongoose schema setup conventions (`DEPLOYMENT_MAP.md` and database setup guides).
* **Verification Method**: Code review.
