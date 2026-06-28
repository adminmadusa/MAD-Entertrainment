---
title: AI Operating System — Validation Reporting Schema
version: 1.0.0
status: active
owner: Platform Team
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - .agents/ai-os/validation/ENGINE.md
supersedes: []
---

# Validation Reporting Schema

This document defines the JSON structure of validation findings and audit reports.

---

## 1. Finding Schema (Zod specification)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Finding",
  "type": "OBJECT",
  "properties": {
    "ruleId": { "type": "STRING" },
    "file": { "type": "STRING" },
    "line": { "type": "INTEGER" },
    "severity": { "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
    "message": { "type": "STRING" },
    "confidence": { "type": "NUMBER", "minimum": 0.0, "maximum": 1.0 },
    "autoFixable": { "type": "BOOLEAN" }
  },
  "required": ["ruleId", "file", "severity", "message", "confidence", "autoFixable"]
}
```

---

## 2. Audit Report Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AuditReport",
  "type": "OBJECT",
  "properties": {
    "timestamp": { "type": "STRING", "format": "date-time" },
    "success": { "type": "BOOLEAN" },
    "summary": {
      "type": "OBJECT",
      "properties": {
        "critical": { "type": "INTEGER" },
        "high": { "type": "INTEGER" },
        "medium": { "type": "INTEGER" },
        "low": { "type": "INTEGER" }
      },
      "required": ["critical", "high", "medium", "low"]
    },
    "findings": {
      "type": "ARRAY",
      "items": { "$ref": "#/definitions/Finding" }
    }
  },
  "required": ["timestamp", "success", "summary", "findings"]
}
```
* **Success Rule**: The `success` boolean must evaluate to false if `summary.critical` > 0 or `summary.high` > 0.
