---
title: AI Operating System — Database Validator
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/README.md
supersedes: []
---

# Database Validator

* **Purpose**: Identifies missing database transaction sessions and enforces auto-indexing configurations in production.
* **Scope**: Express service files and Mongoose model schemas.
* **Inputs**: Service files, schema files.
* **Outputs**: Transaction and index alerts.
* **Required Knowledge Layers**: Standards (Database), Patterns (Transaction, Index Policy).
* **Detection Strategy**: Scans schemas for autoIndex options and checks service writes for `runInTransaction` wrappers and session references.
* **Rule IDs**: VAL-DB-001 (missing transaction boundaries), VAL-DB-002 (autoIndex enabled).
* **Severity Levels**: HIGH (partial writes), HIGH (autoIndex lockouts).
* **Confidence Score**: 0.8.
* **Auto-fix Capability**: None.
* **False Positive Risks**: Medium (some schemas do not require index adjustments).
* **Dependencies**: TS AST parser.
* **Related Standards**: [DATABASE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/DATABASE.md).
* **Related Patterns**: [TRANSACTION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/patterns/backend/TRANSACTION.md), [INDEX_POLICY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/patterns/database/INDEX_POLICY.md).
* **Related Anti-Patterns**: [MISSING_TRANSACTION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/anti-patterns/backend/MISSING_TRANSACTION.md), [AUTOINDEX_IN_PROD.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/anti-patterns/database/AUTOINDEX_IN_PROD.md).
* **Related Governance Rules**: [OWNERSHIP.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/OWNERSHIP.md).
