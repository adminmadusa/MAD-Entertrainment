---
title: AI Operating System — Architecture Decision Index
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/architecture/README.md
supersedes: []
---

# Architecture Decision Index

This index lists the Architecture Decision Records (ADRs) that govern the technical design of the AI Operating System.

---

| ADR ID | Title | Status | Scope | Affected Layers |
|--------|-------|--------|-------|-----------------|
| **ADR-001** | Root Namespace Configuration | Accepted | Global | All folders |
| **ADR-002** | Centralized Schema Location | Accepted | Validation | Schemas and scripts |
| **ADR-003** | 12 Governance Modules Definition | Accepted | Governance | Governance, templates |
| **ADR-004** | 7-State Skill Lifecycle Model | Accepted | Skills | Skills, registries |
| **ADR-005** | Human-Primary KI Ownership | Accepted | Knowledge | Knowledge, brain/KIs |
| **ADR-006** | 10-Tier Conflict Precedence Hierarchy | Accepted | Dependencies | Conflict resolution |
| **ADR-007** | 5-Step Registry-First Discovery Protocol | Accepted | AI behavior | Prompts, skills, runtime |
| **ADR-008** | 5 Auto-Generated Registries Setup | Accepted | Registries | Skills, prompts, domain, ADRs, governance |
| **ADR-009** | MAJOR Version Compatibility Rules | Accepted | Versioning | VERSION.md, dependencies |
| **ADR-010** | ADR Amendment & Freeze Policy | Accepted | Architecture | DECISION_INDEX.md |

*Authoritative Source*: [ADR Pack v1.0](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_ADR_Pack_v1.md).
