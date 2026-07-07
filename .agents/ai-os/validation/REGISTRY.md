---
title: AI Operating System — Validator Registry
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/ENGINE.md
supersedes: []
---

# Validator Registry

This document lists the active validators registered in the AI Operating System.

---

## 1. Registry Index

| Validator ID | Name | Target Paths | Required Knowledge Layers |
|--------------|------|--------------|---------------------------|
| **VAL-NAM-001** | File & Folder Naming | `**/*` | Standards, Repository |
| **VAL-REP-001** | Repository structure & Hygiene | `**/*` | Repository, Governance |
| **VAL-ARC-001** | Package Import Boundaries | `apps/**/*`, `packages/**/*` | Architecture |
| **VAL-TS-001** | TypeScript Type Safety | `**/*.{ts,tsx}` | Standards |
| **VAL-REC-001** | React Component Safety | `**/*.{ts,tsx}` | Standards, Patterns |
| **VAL-NXT-001** | Next.js Routing & Layouts | `apps/web/**/*`, `apps/admin/**/*` | Standards |
| **VAL-EXP-001** | Express Routing & Async Handlers | `apps/server/**/*` | Standards, Patterns |
| **VAL-DB-001** | Database Transactions & Indexes | `apps/server/**/*` | Standards, Patterns |
| **VAL-API-001** | Swagger OpenAPI schemas | `apps/server/**/*` | Standards |
| **VAL-SEC-001** | Production Mock Block & Webhooks | `apps/server/**/*` | Standards, Patterns, Anti-Patterns |
| **VAL-PFM-001** | Math.random restrictions | `**/*.{ts,tsx,js,jsx}` | Standards, Anti-Patterns |
| **VAL-A11Y-001** | Semantic HTML checks | `**/*.{ts,tsx}` | Standards |
| **VAL-TST-001** | Test File Qualifiers | `**/*.test.{ts,tsx}` | Standards |
| **VAL-DOC-001** | absolute Linking & Metadata | `**/*.md` | Standards, Anti-Patterns |
| **VAL-GOV-001** | Manual Verification Gates | `**/*` | Governance |

---

## 2. Dependency Matrix
Validators run independently. Their execution has zero cross-dependencies, allowing concurrent execution during CI validation pipelines.
