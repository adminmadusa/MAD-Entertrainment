---
title: AI Operating System — Report Generation Specifications
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/runtime/README.md
supersedes: []
---

# Report Generation Specifications

* **Module ID**: RUN-REP-001
* **Purpose**: Coordinates markdown report generation templates based on validation outputs.
* **Output schemas**:
  - Ingests validator findings array.
  - Formats data using layout keys defined in Template layer (e.g. `TMP-AUD-001`).
  - Emits JSON artifacts and human-readable markdown summaries.
