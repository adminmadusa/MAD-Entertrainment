---
title: AI Operating System — Project Skills Library Entry Point
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/skills/README.md
supersedes: []
---

# Project Skills Library

Welcome to the Project Skills Library of the AI Operating System. This library defines the MAD Entertrainment–specific orchestration flows that enforce business domain rules, integration boundaries, and local workspace governance.

Unlike Core Skills, Project Skills are contextualized by the business capabilities and workflows defined in the Domain and Architecture layers.

## Directory Inventory

The Project Skills Library contains the following folders:
- [README.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/skills/project/README.md) — This entry point and inventory.

### Project Skills
- **authentication-audit**: Validates identity access and token signature boundaries.
- **booking-audit**: Verifies reservation lock limits and seat status mappings.
- **payment-audit**: Enforces payment gateway configurations and secure webhooks signature checks.
- **ticket-audit**: Monitors ticket generation and scanners authorization gates.
- **repository-governance**: Checks active branch parameters and gate approvals.

## Precedence & Dependencies
All files in the Project Skills Library are Tier 8 (Skills) artifacts. They depend on all other layers of the AI Operating System (Foundation, Repository, Domain, Architecture, Standards, Patterns, Anti-Patterns, Governance, and Validation), as well as Core Skills.
