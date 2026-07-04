---
title: AI Operating System — Authentication Audit Project Skill
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/skills/project/README.md
supersedes: []
---

# Authentication Audit Project Skill

* **Skill ID**: SKI-PRJ-001
* **Purpose**: Evaluates authentication handlers, passwordless OTP hashes, JWT sign routines, and client signup flows to verify compliance with platform design conventions.
* **Repository Scope**: `@mad/server` auth controllers, `@mad/shared` auth validations.
* **Business Context**: Customer identity registration and user access authentication mechanisms.
* **Required Inputs**: Authentication router source files.
* **Produced Outputs**: Security audit findings.
* **AI OS Dependencies**: [AUTHENTICATION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/domain/AUTHENTICATION.md), [SECURITY_ARCHITECTURE.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/architecture/SECURITY_ARCHITECTURE.md).
* **Core Skill Dependencies**: `security-audit`, `typescript-audit`.
* **Validation Dependencies**: `VAL-SEC-002`, `VAL-TS-001`.
* **Confidence Model**: 0.8.
* **Human Review Requirements**: Changes to token expiry thresholds require architecture lead approval.
