---
title: AI Operating System — Changelog
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/FOUNDATION.md
supersedes: []
---

# AI Operating System — Changelog

All notable changes to the AI Operating System will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] — 2026-06-28
### Added
- **Phase 1: Foundation Layer** established at `.agents/ai-os/` to avoid collisions with the workspace customization file `.agents/AGENTS.md`.
- Initial orienting documents introduced:
  - `FOUNDATION.md` — Core identity, mission, principles, boundaries, layers, governance matrix, and operating rules.
  - `README.md` — entry point for human engineers.
  - `INDEX.md` — master navigation directory for all planned/active artifacts.
  - `VERSION.md` — compatibility and semantic versioning rules registry.
  - `CHANGELOG.md` — changelog tracker.
- Added runtime ignore rule in root `.gitignore` to exclude `.agents/ai-os/runtime/` directories from source control.
