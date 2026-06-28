---
title: AI Operating System — Repository Governance Audit Project Skill
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/skills/project/README.md
supersedes: []
---

# Repository Governance Audit Project Skill

* **Skill ID**: SKI-PRJ-005
* **Purpose**: Enforces One Task Rules, branches lifecycles, and verification gates.
* **Repository Scope**: Workspace git state and active issues branch updates.
* **Business Context**: Operational compliance policies and branch hygiene.
* **Required Inputs**: Git workspace current status.
* **Produced Outputs**: Governance compliance warnings.
* **AI OS Dependencies**: [AUDIT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/AUDIT.md), [GIT.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/governance/GIT.md).
* **Core Skill Dependencies**: `naming-audit`.
* **Validation Dependencies**: `VAL-GOV-001`, `VAL-GOV-002`.
* **Confidence Model**: 1.0 (exact git state parsing).
* **Human Review Requirements**: Branch cleanup warnings must be addressed manually.
