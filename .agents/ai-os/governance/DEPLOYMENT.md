---
title: AI Operating System — Deployment Governance
version: 1.0.0
status: active
owner: Repository Governance Owner
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/governance/README.md
supersedes: []
---

# Deployment Governance

* **Governance ID**: GOV-DEP-001
* **Purpose**: Restricts deployment pipelines and enforces staging environment verification rules.
* **Scope**: Deployment tasks and environments mapping.
* **Owner**: Repository Governance Owner
* **Deployment Parity Check**:
  - Before auditing or debugging any issue, verify active environments:
    - Vercel Production is deployed from the `live` branch.
    - Vercel Staging/Test is deployed from the `develop` branch.
    - Render Backend runs strictly from the `live` branch (production backend only).
  - **Shared Backend Constraint**: Staging and testing frontend builds (`test.esparex.in`) share and write directly to the production Render backend (`apm.esparex.in`).
  - **Replication Principle**: A bug is not classified as reproducible until deployment parity settings have been verified.
* **Release Approval**:
  - Merging `develop` into `live` is forbidden without build validations, contract reviews, and a documented rollback strategy.
* **Related Repository Documents**: `AGENTS.md` (Release Governance and Deployment Parity Check).
