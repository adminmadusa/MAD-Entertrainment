# Naming Audit Examples

* **Violation Casing example**:
  - Path: `apps/web/components/mybutton.tsx` (violates component PascalCase rules)
  - Finding output: ruleId `VAL-NAM-001`, severity `HIGH`, message: "Component files must use PascalCase casing."
* **Violation Folder example**:
  - Path: `apps/server/src/temp/` (violates disallowed folders list)
  - Finding output: ruleId `VAL-NAM-002`, severity `MEDIUM`, message: "Disallowed folder 'temp' detected."
