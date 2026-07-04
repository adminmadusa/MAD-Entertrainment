---
title: AI Operating System — Caching Specifications
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/runtime/README.md
supersedes: []
---

# Caching Specifications

* **Module ID**: RUN-CCH-001
* **Purpose**: Manages runtime cache locations, file hashes, and cache invalidation gates.
* **Cache Paths**:
  - All cache data persists under `.agents/ai-os/runtime/cache/` (shielded by `.gitignore` rules).
  - Schema caches validate file hash states before skipping validations runs.
