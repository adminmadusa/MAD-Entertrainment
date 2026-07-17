## Context

The repository currently lacks strict local compiler and linter options for checking unused local variables, parameters, and imports. This allows dead variables and unused imports to accumulate, triggering CodeQL security and quality alerts in CI. 

This design establishes a clean local quality gate to catch these issues prior to pushing code.

## Goals / Non-Goals

**Goals:**
- Enforce `"noUnusedLocals": true` and `"noUnusedParameters": true` in `tsconfig.base.json`.
- Standardize ESLint configurations to disable the base JS `no-unused-vars` rule and configure the TypeScript-aware `@typescript-eslint/no-unused-vars` rule as an `'error'`.
- Clean up all existing code violations discovered by the new rules.

**Non-Goals:**
- Enabling `"strict": true` globally (deferred to Phase 2 strictness migration).
- Enabling `noImplicitAny` or other compiler strictness controls.
- Perform general refactoring of active components.

## Decisions

### Decision: Unused-Variable Check Delegation
- **Choice**: Turn off the base JavaScript `no-unused-vars` rule and configure `@typescript-eslint/no-unused-vars` as an error.
- **Rationale**: The base JS rule does not understand TypeScript syntax (like typescript types, generics, and namespaces) and produces duplicate/incorrect alerts. The TypeScript compiler is responsible for checking unused local variables and parameters, while ESLint handles unused imports and code footprint style.
- **Alternatives Considered**: Using ESLint alone or TypeScript alone. Neither covers the full spectrum of type imports and local scope safety.

## Risks / Trade-offs

- **[Risk]** → Enabling strict compiler blocks might disrupt development speed during active coding.
  - *Mitigation*: Allow parameters and variables that are intentionally left unused to be prefixed with an underscore (`_`), letting the compiler compile successfully.
- **[Risk]** → Bulk cleanup of existing violations might accidentally delete code that has side effects.
  - *Mitigation*: Restrict code edits to removing purely unused declarations. Do not alter any executable expressions.
