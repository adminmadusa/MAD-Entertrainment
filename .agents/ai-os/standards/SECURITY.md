---
title: AI Operating System — Security Standards
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/standards/README.md
supersedes: []
---

# Security Standards

This document records the cryptology rules, token validations, and environment secret boundaries.

---

### STD-SEC-001
* **Rule ID**: STD-SEC-001
* **Title**: Production Mock Payments Block
* **Description**: Mock payment adapter configurations or mock identifiers (e.g. `pi_mock_123`) must be rejected at runtime in production environments.
* **Severity**: Critical
* **Scope**: Express payment routes and controller files
* **Rationale**: Bypassing actual payment channels in production leads to severe financial and inventory losses.
* **Repository Evidence**: Production assertions in `apps/server/src/services/admin/refund.service.ts` and `apps/server/src/services/public/payment.production.test.ts`.
* **Verification Method**: Test suite execution (`pnpm test`).
* **Example**:
  ```ts
  if (process.env.NODE_ENV === 'production' && isMockId(id)) {
    throw new Error('MOCK_PAYMENT_IDENTIFIER_DETECTED');
  }
  ```

---

### STD-SEC-002
* **Rule ID**: STD-SEC-002
* **Title**: Environment Secret Isolation
* **Description**: Secure API secrets (such as Stripe API keys, database strings) must reside in gitignored environment configs, validated at runtime using Zod environment schemas.
* **Severity**: High
* **Scope**: Workspace configuration files
* **Rationale**: Hardcoding secret credentials inside version control leaks authorization keys to public rosters.
* **Repository Evidence**: `apps/server/package.json` dependency `"dotenv": "^16.6.1"`, env setup validations.
* **Verification Method**: Code review and secret scanner tasks.
