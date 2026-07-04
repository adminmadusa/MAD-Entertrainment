# Repository Audit Examples

* **System execution call**:
  - Ingests path names list, runs validators, outputs standard report.
  - Failure case: Emits JSON with `success: false` if any file contains temporary names (e.g. `apps/web/temp2`).
