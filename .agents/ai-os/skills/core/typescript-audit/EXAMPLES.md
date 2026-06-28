# TypeScript Audit Examples

* **Violation any example**:
  - Code: `const payload: any = parseData();` (violates strongly typed guidelines)
  - Finding output: ruleId `VAL-TS-001`, severity `HIGH`, message: "Explicit 'any' type annotation detected."
* **Violation ignore example**:
  - Code: `// @ts-ignore`
  - Finding output: ruleId `VAL-TS-002`, severity `MEDIUM`, message: "Banned compiler comment '@ts-ignore' detected."
