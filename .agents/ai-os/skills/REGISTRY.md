---
title: AI Operating System — Skills Registry
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/skills/README.md
supersedes: []
---

# Skills Registry

This document lists the active core skills registered in the AI Operating System.

---

## 1. Skill Catalog Registry

| Skill ID | Version | Status | Owner | Knowledge Dependencies | Validation Dependencies | Consumers |
|----------|---------|--------|-------|------------------------|-------------------------|-----------|
| **SKI-COR-001** (naming-audit) | 1.0.0 | active | Platform Team | Standards (Naming) | VAL-NAM-001, VAL-NAM-002 | CLI, CI Hooks, Prompt Library |
| **SKI-COR-002** (architecture-review) | 1.0.0 | active | Platform Team | Architecture (Package Boundaries) | VAL-ARC-001, VAL-ARC-002 | CLI, CI Hooks, Prompt Library |
| **SKI-COR-003** (typescript-audit) | 1.0.0 | active | Platform Team | Standards (TypeScript) | VAL-TS-001, VAL-TS-002 | CLI, CI Hooks, Prompt Library |
| **SKI-COR-004** (react-audit) | 1.0.0 | active | Platform Team | Standards (React), Patterns (Hydration Safety) | VAL-REC-001, VAL-REC-002 | CLI, CI Hooks, Prompt Library |
| **SKI-COR-005** (security-audit) | 1.0.0 | active | Platform Team | Standards (Security), Patterns (Mock Payment Lock) | VAL-SEC-001, VAL-SEC-002 | CLI, CI Hooks, Prompt Library |

---

## 2. Skill Dependency Graph
Skills run independently of each other but require validation schemas from the Validation layer and rule parameters from the Standards layer.
