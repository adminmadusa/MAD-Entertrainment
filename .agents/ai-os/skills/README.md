---
title: AI Operating System — Skills Library Entry Point
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/FOUNDATION.md
supersedes: []
---

# Core Skills Library

Welcome to the Core Skills Library of the AI Operating System. This library defines the repository-agnostic AI capabilities and execution workflows that orchestrate static audits, style verifications, and compliance tasks.

Skills do not declare new engineering rules; they ingest context and orchestrate validations defined in the Standards, Patterns, and Validation layers.

## Directory Inventory

The Skills Library contains the following documents:
- [README.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/skills/README.md) — This entry point and inventory.
- [REGISTRY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/skills/REGISTRY.md) — The catalog mapping active core skills.

### Core Skills
- **naming-audit**: Checks naming casing and folder conventions.
- **architecture-review**: Enforces import boundaries and detects circular references.
- **typescript-audit**: Evaluates type safety and bans `any` keywords.
- **react-audit**: Guarantees component hydration safety.
- **security-audit**: Blocks mock payments and verifies webhook signature setups.

## Precedence & Dependencies
All files in the Skills Library are Tier 8 (Skills) artifacts. They represent the highest layer of the AI Operating System. They depend on all other layers (Foundation, Repository, Domain, Architecture, Standards, Patterns, Anti-Patterns, Governance, and Validation). They are invoked directly by user-facing prompts.
