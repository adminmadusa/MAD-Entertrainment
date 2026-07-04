---
name: "architecture-review"
description: "Audit monorepo boundaries, package dependencies, API contracts, GStack design patterns, and draft Architecture Decision Records (ADRs)."
version: "1.1"
owner: "Technical Architect"
last_updated: "2026-07-03"
depends_on: "None"
supersedes: "GStack"
scope: "Architecture"
priority: "Core"
---

# Architecture Review Skill

## Purpose
Maintain the structural integrity of the monorepo packages, prevent circular dependency leakages, align client-server API contracts, and guide architectural evolution.

## Trigger Keywords
monorepo boundary, package dependencies, API contract, GStack, circular dependency, ADR, architecture, shared packages, packages/types, packages/utils, backend-frontend alignment, domain model, system design, package coupling, service boundary, cross-package refactoring, shared library extraction, dependency inversion, package ownership review, domain boundary review, repository restructuring.

## Prerequisites
- Review the repository's API contract documentation (if present), shared types, validation schemas, and server/client interfaces before proposing architectural changes.
- Monorepo package structure mapped.
- Circular package references checked.
- Existing architecture reviewed before proposing changes.

## Architecture Principles
- Prefer extending existing packages over creating new ones.
- Keep dependency direction acyclic.
- Shared packages must never depend on applications.
- Minimize coupling between layers.
- Favor composition over duplication.
- Preserve backward compatibility where practical.

## Architecture Review Workflow
Before recommending architectural changes:
1. Map affected packages.
2. Identify dependency direction.
3. Review existing shared abstractions.
4. Verify API contract compatibility.
5. Check cross-layer impact.
6. Determine whether an ADR is required.
7. Prefer extending existing architecture over introducing new modules.

## Responsibilities

### 1. Monorepo Architecture & Scope
- **Package Modularity**: Ensure code lives in correct packages (`shared`, `ui`, `types`, `utils`, `validations`).
- **Dependency Flow**: Check import statements to enforce dependency direction rules (e.g. shared packages must never import apps).
- **Circular Imports**: Actively trace and prevent circular package imports.
- **Structural Ownership**: Review package boundaries, layer separation, and shared libraries.

### 2. API Contracts & End-to-End Architecture
- **Contract Compatibility**: Ensure request schemas, response schemas, and DTOs match client-server boundaries exactly.
- **Cross-Layer Data Flow**: Enforce a strict multi-tier pipeline:
  `packages/types` -> `packages/validations` -> `apps/server` (controller/service) -> client apps (`apps/web`, `apps/admin`).
- **GStack Workflow**: Apply the repository's GStack workflow when a feature spans multiple packages or applications, ensuring the impact is reviewed from shared types through validation, backend services, and client applications.
- **Domain Boundaries**: Keep database models and schemas decoupled from client-side visual layers.

### 3. ADR Guidance
- **ADR Creation**: Enforce ADR creation when introducing new databases, modifying major APIs, or creating shared library systems.
- **Documenting Trade-offs**: Detail alternatives, trade-offs, and rollback options in the ADR.

## Boundaries
- **When to Use**:
  - New repository architecture.
  - Cross-package refactoring, shared library extraction, and repository restructuring.
  - API contract reviews and dependency direction analysis.
  - Features spanning multiple packages or applications.
  - Proposing a design change that requires an Architecture Decision Record (ADR).
- **When NOT to Use**:
  - For visual styling and CSS layout changes (use **ui-ux**).
  - For debugging test runner or compiler failures (use **ci-investigation**).
  - For writing or modifying governance validators/fixers (use **governance-audit**).

## Reuse Policy
Before proposing a new package dependency or structural module:
- Search for existing packages or shared utilities first.
- Never introduce a new package or shared library until you've demonstrated why existing packages cannot satisfy the requirement.
- Reuse types and helper libraries rather than duplicating them.
- Ensure strict separation of concerns between client and server layers.

## Skill Relationships
Primary:
- architecture-review

Collaborates with:
- governance-audit
- ci-investigation
- documentation
- pr-review
- git-workflow

Does Not Replace:
- governance-audit
- ci-investigation
- documentation
- ui-ux
- git-workflow
- pr-review
