---
title: AI Operating System — Security Audit Skill
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/skills/README.md
supersedes: []
---

# Security Audit Skill

* **Skill ID**: SKI-COR-005
* **Purpose**: Identifies sandbox payment overrides active in production and scans webhooks signature validation gates.
* **Problem Solved**: Leaving testing endpoints or mock transactions open in production introduces critical financial and data exploits.
* **Required Context**: Payment controller codebase paths.
* **Knowledge Dependencies**: [SECURITY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/standards/SECURITY.md), [MOCK_PAYMENT_LOCK.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/patterns/security/MOCK_PAYMENT_LOCK.md).
* **Validation Dependencies**: [SECURITY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/validation/validators/SECURITY.md).
* **Confidence Model**: 0.8 (heuristics matching string literals like `pi_mock_` inside integration adapters).
* **Human Review Requirements**: None (all mock paths in production must carry environment status verification checks).
