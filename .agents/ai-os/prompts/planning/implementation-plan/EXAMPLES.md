# Implementation Plan Examples

* **System execution call**:
  - Ingests issue description, compiles targets list, outputs `implementation_plan.md` artifact.
  - Failure case: If files list includes relative paths or links that do not use absolute `file://` scheme, the link check fails.
