# UI Governance Baseline Report

## Metadata
* **Owner**: Repository Governance Owner
* **Baseline Date**: 2026-07-07
* **Standard Version**: UI-001 (Version 1.1.0)
* **Governance Framework Version**: v2.0.0
* **Status**: Frozen

---

## Registries State

| Metric | Count |
|:---|---:|
| **Total Rules** | **106** |
| **Total Validators** | **21** |
| **Total Test Suite Cases** | **467** |

### Rule Counts by Category

| Category | Rules Count |
|:---|---:|
| DOCUMENTATION | 39 |
| HYGIENE | 26 |
| UI | 23 |
| ARCHITECTURE | 8 |
| UX | 3 |
| SECURITY | 3 |
| ACCESSIBILITY | 2 |
| PERFORMANCE | 2 |

---

## Active UI-001 Rules Specification

These rules are registered and monitored during this validation period:

| Rule ID | Rule Name | Severity | CI Policy | Tags |
|:---|:---|:---|:---|:---|
| **VAL-UI-020** | Alt Text Missing | CRITICAL | FAIL_BUILD | `ui`, `accessibility`, `images`, `wcag`, `ui-001`, `static-analysis` |
| **VAL-UI-021** | Image Missing Dimensions | HIGH | WARN | `ui`, `performance`, `cls`, `images`, `ui-001`, `static-analysis` |
| **VAL-UI-022** | Hardcoded Inline Color | MEDIUM | WARN | `ui`, `tokens`, `colors`, `design-system`, `ui-001`, `static-analysis` |
| **VAL-UI-023** | Overflow-X Hidden on Root Container | HIGH | WARN | `ui`, `responsive`, `overflow`, `layout`, `ui-001`, `static-analysis` |
| **VAL-UI-024** | Arbitrary Tailwind Spacing | LOW | INFO_ONLY | `ui`, `tokens`, `spacing`, `tailwind`, `ui-001`, `static-analysis` |
| **VAL-UI-025** | Duplicate Tailwind Utilities | LOW | INFO_ONLY | `ui`, `tailwind`, `dead-code`, `hygiene`, `ui-001`, `static-analysis` |
| **VAL-UX-001** | Missing Loading State | HIGH | WARN | `ux`, `loading`, `states`, `ui-001`, `static-analysis` |
| **VAL-UX-002** | Missing Empty State | HIGH | WARN | `ux`, `empty-state`, `states`, `ui-001`, `static-analysis` |
| **VAL-UX-003** | Missing Error State | HIGH | WARN | `ux`, `error-state`, `states`, `ui-001`, `static-analysis` |

---

## Frozen Performance Budgets

Timings must satisfy the following limits:

| Stage | Budget (Target) |
|:---|---:|
| Repository Scan | < 50 ms |
| AST Parsing | < 100 ms |
| Validation | < 200 ms |
| Reporting | < 50 ms |
| **Total Execution** | **< 500 ms** |
