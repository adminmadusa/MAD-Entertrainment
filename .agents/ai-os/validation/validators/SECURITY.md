---
title: AI Operating System — Security Validator
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/README.md
supersedes: []
---

# Security Validator

* **Purpose**: Blocks mock payment identifiers in production, and validates webhook signature verifications.
* **Scope**: Express payment routes and gateway controllers.
* **Inputs**: Payment adapter files and webhook handler routes.
* **Outputs**: Cryptographic checks and production blocks warnings.
* **Required Knowledge Layers**: Standards (Security), Patterns (Mock Payment Lock, Webhook Validation), Anti-Patterns (Production Mock Payment).
* **Detection Strategy**: Scans codebase for test identifiers checking environment parameters, and checks webhook payload handlers verify signatures cryptographically.
* **Rule IDs**: VAL-SEC-001 (mock payments in prod), VAL-SEC-002 (missing signature webhooks checks).
* **Severity Levels**: CRITICAL (exploit risks).
* **Confidence Score**: 0.8.
* **Auto-fix Capability**: None.
* **False Positive Risks**: Low.
* **Dependencies**: TS AST parser.
* **Related Standards**: [SECURITY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/SECURITY.md).
* **Related Patterns**: [MOCK_PAYMENT_LOCK.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/patterns/security/MOCK_PAYMENT_LOCK.md), [WEBHOOK_VALIDATION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/patterns/security/WEBHOOK_VALIDATION.md).
* **Related Anti-Patterns**: [PRODUCTION_MOCK_PAYMENT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/anti-patterns/security/PRODUCTION_MOCK_PAYMENT.md).
* **Related Governance Rules**: [DEPLOYMENT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/DEPLOYMENT.md).
