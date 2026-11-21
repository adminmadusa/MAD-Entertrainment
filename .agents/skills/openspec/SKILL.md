---
name: openspec
description: >
  Unified OpenSpec specification and change management skill.
  Handles proposing, exploring, updating, applying, syncing, and archiving
  feature changes and specifications in the OpenSpec format.
---

# OpenSpec Unified Change Management Skill

## Purpose
OpenSpec standardizes specification-driven development across the repository. It manages changes through a clear lifecycle: propose $\to$ explore $\to$ apply $\to$ sync $\to$ archive.

---

## Commands & Workflows

### 1. Propose (`openspec propose`)
Create a new feature or change proposal.
- Generate `proposal.md`, `design.md`, delta specifications in `specs/`, and `tasks.md`.
- Ensure all requirements follow declarative RFC 2119 keywords (`SHALL`, `MUST`, `SHOULD`).

### 2. Explore (`openspec explore`)
Thinking partner mode to investigate ideas, analyze trade-offs, and refine requirements before drafting a change proposal.

### 3. Apply (`openspec apply`)
Execute planned tasks from an active change proposal:
- Implement code strictly aligned with the change's `specs/` and `design.md`.
- Mark completed tasks sequentially in `tasks.md`.

### 4. Update (`openspec update`)
Revise existing planning artifacts, keeping `proposal.md`, `design.md`, `specs/`, and `tasks.md` coherent when decisions change mid-implementation.

### 5. Sync Specs (`openspec sync-specs`)
Sync delta specs from an active change into the canonical `openspec/SPECS.md` index.

### 6. Archive (`openspec archive`)
Finalize an implemented change:
- Verify all tasks in `tasks.md` are complete.
- Sync final specifications into `openspec/SPECS.md`.
- Move the change record to archive.
