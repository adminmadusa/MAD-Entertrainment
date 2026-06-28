# Architecture Review Examples

* **Violation Boundary example**:
  - File: `packages/shared/src/utils.ts`
  - Code: `import { getEvent } from '@mad/server/services/event';` (violates package flow rules: shared cannot import from server apps)
  - Finding output: ruleId `VAL-ARC-001`, severity `CRITICAL`, message: "Package '@mad/shared' cannot import from '@mad/server'."
* **Violation Circular example**:
  - Code: File A imports File B, which imports File A.
  - Finding output: ruleId `VAL-ARC-002`, severity `CRITICAL`, message: "Circular dependencies cycle detected: A -> B -> A."
