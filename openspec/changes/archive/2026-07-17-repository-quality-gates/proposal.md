## Why

The repository currently lacks strict local compiler and lint checks for unused variables, parameters, and imports, leading to CodeQL security and quality gate alerts in CI. Standardizing and enforcing these quality gates locally prevents stale or dead code from being committed, improves overall repository hygiene, and aligns local feedback with CI gating.

## What Changes

- Enable strict unused local and parameter diagnostics in the TypeScript compiler configurations.
- Configure and unify the `@typescript-eslint/no-unused-vars` linting rule to treat unused variables and parameters as errors across all subprojects, replacing the duplicate JavaScript `no-unused-vars` rule.
- Cleanup all existing unused import, parameter, and variable violations discovered in the workspace.
- Update repository governance guidelines to make lint and type checks mandatory for branch merges.

## Capabilities

### New Capabilities
- `repository-quality-gates`: Standardized compiler and lint checks for unused imports, local variables, and parameters, ensuring strict repository hygiene.

### Modified Capabilities

## Impact

- **TypeScript Compiler Options**: Unused locals and parameters will prevent successful local compilation (`pnpm build` and `pnpm type-check` will fail).
- **ESLint Configurations**: All workspace packages and applications (`apps/web`, `apps/admin`, `apps/server`, and shared packages) will fail linting on unused variables or imports.
- **Source Code Cleanup**: Unused imports/variables in active code will be removed to satisfy the new rules.
