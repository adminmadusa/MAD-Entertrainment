---
title: AI Operating System — Foundation Constitution
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on: []
supersedes: []
---

# AI Operating System — Foundation Constitution

## 1. Identity
* **Purpose**: The AI Operating System (AI OS) is a structured, versioned knowledge and capability registry embedded in the MAD Entertrainment monorepo. It serves to align human developers and AI agents on architectural patterns, coding conventions, and business domain rules.
* **Mission**: To eliminate AI hallucinations of domain logic, prevent duplicate knowledge, and enable safe, self-directed AI navigation and code generation.
* **Scope**: All AI capability definitions (`skills/`), instruction sets (`prompts/`), standards, schemas, registries, and domain business rules within the repository.
* **Non-Goals**: The AI OS does not execute code, replace human developer judgment, manage runtime deployment pipelines, or act as a general-purpose conversational agent.

*Authoritative Design Reference*: [Architecture Review v2.0](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_Architecture_Review_v2.md) and [Functional Specification v1.0](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_Functional_Specification_v1.md).

## 2. Core Principles
The AI OS is bound by ten immutable principles defined in [Functional Specification Part 2](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_Functional_Specification_v1.md#L94):
* **P-001 — Single Responsibility**: Every artifact has exactly one reason to exist.
* **P-002 — Single Source of Truth (SSOT)**: Every fact is declared in exactly one authoritative document.
* **P-003 — Explicit Dependencies**: Artifacts must declare all dependencies recursively in metadata.
* **P-004 — No Duplication**: Reuse knowledge and capabilities via reference, not duplication.
* **P-005 — Layer Isolation**: Dependencies flow strictly top-down. Upward layer references are blocked.
* **P-006 — Traceability**: All AI recommendations and decisions must cite an authoritative AI OS file.
* **P-007 — Review Before Creation**: Duplicate checks are mandatory before committing new knowledge.
* **P-008 — Simplicity First**: Simple and maintainable layouts are preferred over complex ones.
* **P-009 — Governance Before Implementation**: Artifacts cannot be created without an approved governing module.
* **P-010 — Reversibility**: Changes must be versioned, deprecated, or archived, never destructively overwritten.

## 3. System Boundaries
* **In-Scope (AI OS Ownership)**:
  - Repository mapping and environment configurations (`repository/`)
  - Domain state lifecycles and business rules (`domain/`)
  - Architecture Decision Records (ADRs) and contracts (`architecture/`)
  - Coding conventions and patterns/anti-patterns (`standards/`)
  - Executable validation rules, schemas, and catalogs (`validation/`, registries)
  - AI capability structures and instructions (`skills/`, `prompts/`, `templates/`)
  - Human-curated Knowledge Items (`knowledge/`)
* **Out-of-Scope (System Boundaries)**:
  - Ephemeral runtime states, memory caches, and session history (`runtime/` store)
  - Vector embeddings and vector store indexes (these are transient, search-only derivatives)
  - Production database engines, server execution environments, and deploy runners.

## 4. Layer Overview
The AI OS is organized into an 8-layer knowledge stack. The conceptual stack is detailed in [Architecture Review v2.0 Section 1.2](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_Architecture_Review_v2.md):
1. **Repository Layer** *(Layer 1)*: Maps workspace packages, aliased import paths, and environment settings.
2. **Domain Layer** *(Layer 2)*: Canonical business rules and lifecycles (e.g. Booking state engine).
3. **Architecture Layer** *(Layer 3)*: Contains ADRs and interface contracts.
4. **Standards Layer** *(Layer 4)*: Defines technology conventions, patterns, and anti-patterns.
5. **Skills Layer** *(Layer 5)*: Defines stateless AI capabilities.
6. **Prompts Layer** *(Layer 6)*: Instruction orchestrations.
7. **Templates Layer** *(Layer 7)*: Structured boilerplates.
8. **Memory/Leaf Layer** *(Layer 8)*: Holds constants, glossary definitions, and shared enums.

*Orthogonal Components*: Governance matrix acts across all layers. Knowledge Items (KIs) represent derived, non-authoritative references.

## 5. Dependency Constitution
* **Topological Flow**: Higher layers reference lower layers (e.g. Prompts → Skills → Standards → Architecture → Domain → Memory). Lower layers must never reference higher layers.
* **Precedence Hierarchy**: If two documents conflict, authority is determined by the ordered list defined in [ADR-006](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_ADR_Pack_v1.md):
  1. `FOUNDATION.md` (Constitutional)
  2. `constants/` (Leaf values)
  3. `glossary/` (Vocabulary definitions)
  4. `domain/` (Business rules)
  5. `architecture/` (Architectural ADRs)
  6. `standards/` (Conventions and patterns)
  7. `knowledge/` (Knowledge Items - non-authoritative)
  8. `prompts/` (Task instructions)

*Same-Tier Conflict escalation limits*: Constants (24 hours), Domain (48 hours), ADRs (5 business days), Standards (48 hours). Refer to [ADR-006](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_ADR_Pack_v1.md) for full details.

## 6. Governance Constitution
The AI OS is governed by 12 distinct modules as defined in [ADR-003](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_ADR_Pack_v1.md):
- **Governance Modules**: `foundation`, `repository`, `domain`, `architecture`, `standards`, `skills`, `prompts`, `templates`, `knowledge`, `git`, `security`, and `deployment`.
- **Enforcement Philosophy**: Changes to core layers require formal review by designated human owners (Tech Lead, Domain Expert + Backend Lead, Platform Team) through Pull Request verification checks. The validation runner (`validate-ai`) acts as the gatekeeper.

## 7. AI Agent Operating Model
AI agents executing tasks in this repository must operate according to the following baseline:

* **Mandatory Pre-Task Reading Sequence** ([Functional Specification Part 6.1](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_Functional_Specification_v1.md#L1162)):
  1. Read [FOUNDATION.md](file:///Users/admin/Desktop/MAD%20Entertrainment/.agents/ai-os/FOUNDATION.md) (orientation)
  2. Read `repository/map.md` (codebase geography)
  3. Read `repository/packages.md` (packages scope)
  4. Read `domain/<affected-domain>/lifecycle.md` (state machine)
  5. Read `domain/<affected-domain>/rules.md` (business rules)
  6. Read `standards/<relevant-technology>/` (coding standards)
  7. Read `architecture/decisions/` (relevant ADRs)

* **Discovery Protocol** ([ADR-007](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_ADR_Pack_v1.md)):
  1. Registry Lookup (consult `catalog.json` files for skills, prompts, domain, etc.)
  2. Tag Filtering (resolve ambiguity via prompt/skill tags)
  3. Semantic Index Query (optional, consult `runtime/indexes/`)
  4. Metadata Grep (fallback folder scan)
  5. Declare Missing Knowledge (if not found, log missing reference and proceed conservatively)

* **Conflict Resolution**: Apply Tier Precedence Order. Surface conflicts immediately; do not resolve contradictions silently.
* **Missing Knowledge**: Request human clarification. Do not make assumptions or default to training data.

## 8. Growth Principles
The long-term development of the AI OS follows the phased execution defined in the [Implementation Baseline](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_Phase1_Implementation_Baseline.md).
- **Growth Invariants** ([Functional Specification Part 11](file:///Users/admin/.gemini/antigravity-ide/brain/779811d6-484f-466f-9034-b88edfa29085/AI_OS_Functional_Specification_v1.md#L1657)):
  1. No document is ever deleted — it must be archived.
  2. No new layer is added without governance review.
  3. Skills must exist before a prompt can invoke them (Skill-first discipline).
  4. The similarity scan (`VAL-015`) must run before batch commits of new capabilities.

## 9. Version History
* **Version**: 1.0.0
* **Date**: 2026-06-28
* **Status**: Active
* **Release Description**: Initial Phase 1 release introducing the system foundation layer.
