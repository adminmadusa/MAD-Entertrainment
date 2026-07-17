## 1. Configure Quality Gates

- [x] 1.1 Enable `noUnusedLocals` and `noUnusedParameters` in `tsconfig.base.json`.
- [x] 1.2 Disable base `no-unused-vars` and configure `@typescript-eslint/no-unused-vars` as an error in `apps/web/eslint.config.mjs`.
- [x] 1.3 Disable base `no-unused-vars` and configure `@typescript-eslint/no-unused-vars` as an error in `apps/admin/eslint.config.mjs`.
- [x] 1.4 Disable base `no-unused-vars` and configure `@typescript-eslint/no-unused-vars` as an error in `apps/server/eslint.config.mjs`.

## 2. Cleanup Codebase

- [x] 2.1 Run `pnpm type-check` and cleanup all unused local variable/parameter compile-time errors in the workspace.
- [x] 2.2 Run `pnpm lint` and cleanup all unused import/variable lint errors across all applications and shared packages.
- [x] 2.3 Run full `pnpm build` to verify the workspace compiles successfully.
