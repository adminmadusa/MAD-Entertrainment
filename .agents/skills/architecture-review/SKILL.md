# Architecture Review Skill

---
name: "architecture-review"
description: "Audit monorepo boundaries, package dependencies, and draft Architecture Decision Records (ADRs)."
---

## Purpose
Maintain the structural integrity of the monorepo packages, prevent dependency leakages, and ensure significant design choices are documented.

## When to Use
- When introducing a new npm package or monorepo workspace package.
- When mutating backend schemas or Express controllers.
- When proposing a design change that requires an Architecture Decision Record (ADR).

## Inputs
- **Codebase boundaries**: Defined in `ARCHITECTURE.md`.
- **API contracts**: Defined in `API_CONTRACTS.md`.
- **ADR Templates**: Located at `docs/decisions/ADR_TEMPLATE.md`.

## Outputs
- **ADR documents**: Structured text files under `docs/decisions/ADR-XXX-title.md`.
- **Dependency graph update**: Documented in `ARCHITECTURE.md` or dependency matrix.

## Constraints
- **Circular dependencies**: Monorepo packages must never have circular references (e.g., packages/types importing packages/utils which imports packages/types).
- **ADR Numbering**: ADR numbers are permanently assigned. Never renumber, reuse, or delete merged ADR files.
- **Shared packages**: Common utilities, schemas, constants, or types must live in `packages/shared`, `packages/ui`, `packages/types`, `packages/utils`, or `packages/validations`.

## Examples
### Drafting a new ADR
Refer to [docs/decisions/README.md#governance--review-process](file:///Users/admin/Desktop/MAD%20Entertrainment/docs/decisions/README.md#adr-governance--review-process) for guidelines.

## Related Skills
- [pr-review](../pr-review/SKILL.md)
- [documentation](../documentation/SKILL.md)
