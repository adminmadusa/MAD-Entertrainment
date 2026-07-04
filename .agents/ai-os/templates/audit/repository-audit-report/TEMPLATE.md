---
title: AI Operating System — Repository Audit Report Template
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/templates/README.md
supersedes: []
---

# Repository Audit Report Template

* **Template ID**: TMP-AUD-001
* **Purpose**: Defines standardized layout for static analysis sweeps.
* **Output Type**: Markdown file.
* **Version**: 1.0.0
* **Required Sections**:
  - Unified metadata header
  - Title: Repository Audit Report
  - Overview
  - Summary metrics table (critical, high, medium, low counts)
  - Detail violations list
* **Optional Sections**: Auto-fix suggestions.
* **Completion Criteria**: Success resolves true if zero critical/high violations exist.
