---
title: AI Operating System — Payment Audit Project Skill
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/skills/project/README.md
supersedes: []
---

# Payment Audit Project Skill

* **Skill ID**: SKI-PRJ-003
* **Purpose**: Verifies that payment gateway adapters correctly implement environment status verifications and webhook callbacks parse signature headers.
* **Repository Scope**: `@mad/server` payment routes and gateway services.
* **Business Context**: Core transaction checkouts, refunds, and integrations interfaces.
* **Required Inputs**: Payment gateway source code files.
* **Produced Outputs**: Security and payment flow audits.
* **AI OS Dependencies**: [PAYMENTS.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/domain/PAYMENTS.md), [INTEGRATION_ARCHITECTURE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/INTEGRATION_ARCHITECTURE.md).
* **Core Skill Dependencies**: `security-audit`.
* **Validation Dependencies**: `VAL-SEC-001`, `VAL-SEC-002`.
* **Confidence Model**: 0.9.
* **Human Review Requirements**: Changes to live webhook endpoints configuration require platform lead approval.
