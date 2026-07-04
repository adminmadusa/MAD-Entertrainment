---
title: AI Operating System — Prompt Library Entry Point
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/FOUNDATION.md
supersedes: []
---

# Prompt Library

Welcome to the Prompt Library of the AI Operating System. This library defines the orchestration prompts that compose knowledge, validators, and skills into executable templates for AI agents.

Prompts do not declare new engineering rules; they define instructions and workflow contexts that guide agent tasks to maintain alignment with AI OS layers.

## Directory Inventory

The Prompt Library contains the following folders:
- [README.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/prompts/README.md) — This entry point and inventory.
- [REGISTRY.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/prompts/REGISTRY.md) — The catalog mapping active prompts.

### Prompts
- **audit/repository-audit**: Guides codebase audits.
- **implementation/bug-fix**: Guides developer bug-fixing workflows.
- **planning/implementation-plan**: Guides implementation plan blueprint generations.
- **review/code-review**: Enforces code hygiene file-size and quality limits.
- **governance/pre-implementation-audit**: Executes pre-task verification gates.

## Precedence & Dependencies
All files in the Prompt Library are Tier 8 (Prompts) artifacts. They represent the orchestration interface of the AI OS. They depend on all other layers (Foundation, Repository, Domain, Architecture, Standards, Patterns, Anti-Patterns, Governance, Validation, and Skills). They are executed directly by AI coding engines.
