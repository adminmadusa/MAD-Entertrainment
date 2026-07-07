---
title: AI Operating System — Bug Fix Report Template
version: 1.0.0
status: active
owner: Principal AI Systems Architect
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/templates/README.md
supersedes: []
---

# Bug Fix Report Template

* **Template ID**: TMP-IMP-001
* **Purpose**: Defines standardized layout for bug resolution logging.
* **Output Type**: Markdown file.
* **Version**: 1.0.0
* **Required Sections**:
  - Unified metadata header
  - Title: Bug Fix Report
  - Issue Description
  - Root Cause Analysis (GOV-INV-001 evidence)
  - Applied Patches (diff code blocks)
  - Verification Logs (Vitest execution outputs)
* **Optional Sections**: Rollback plans.
* **Completion Criteria**: Success resolves true if Vitest reports 100% pass on modified target assertions.
