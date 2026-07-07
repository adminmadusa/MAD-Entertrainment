# UI Governance Telemetry Report

## Metadata
* **Report Date**: 2026-07-07
* **Sprint / Milestone**: Operational Validation (PR-1)
* **Dataset Size**: 5 branches (26 files scanned)
* **Status**: Completed

---

## Telemetry Metrics Summary

| Branch | Commit | Files Scanned | Rules Executed | Violations | Critical | Warnings | Execution Time | False Positives | False Negatives | Developer Notes |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| `feat/scanner-ui-polish` | `edfc388d` | 7 | 10 | 4 | 0 | 4 | 51ms | 0 | 0 | Telemetry validated |
| `feat/scanner-redesign` | `872a2f29` | 8 | 10 | 5 | 0 | 5 | 25ms | 1 | 0 | Static map helper warning |
| `refactor/admin-form-actions-consolidation` | `a067e649` | 5 | 10 | 7 | 0 | 7 | 31ms | 5 | 0 | Static constants flagged |
| `feat/ticket-management-routing` | `d17da803` | 2 | 10 | 0 | 0 | 0 | 13ms | 0 | 0 | Telemetry validated |
| `feat/ui-governance-automation` | `01474430` | 4 | 10 | 0 | 0 | 0 | 18ms | 0 | 0 | Telemetry validated |

---

## Detailed Violation Analysis

### 1. `feat/scanner-ui-polish` (Commit: `edfc388d`)
* **Observed Issues**:
  - `VAL-UX-003` (missing error checks) at `apps/admin/src/app/scanner/page.tsx:39` & `hooks/useScannerState.ts:85/93`
  - `VAL-UX-002` (missing empty checks) at `apps/admin/src/app/scanner/page.tsx:105`
* **Assessment**: Real issues. The component destructures and calls async services but fails to handle loading/error indicators.

### 2. `feat/scanner-redesign` (Commit: `872a2f29`)
* **Observed Issues**:
  - `VAL-UX-002` at `apps/admin/src/hooks/useHtml5QrScanner.ts:35`
* **Assessment**: False Positive. The map is called on `allDevices` which is filtered locally from cameras list.

### 3. `refactor/admin-form-actions-consolidation` (Commit: `a067e649`)
* **Observed Issues**:
  - `VAL-UX-002` at `apps/admin/src/app/ticket-management/page.tsx` (multiple maps on `COLOR_PRESETS`, `ICON_PRESETS`) & `apps/admin/src/components/AdminSidebar.tsx:121` (map on `navGroups`)
* **Assessment**: False Positives. These are static constant arrays mapped to render static configurations. They can never be empty at runtime.

---

## Heuristics Evaluation & False-Positive Analysis

* **UX State Validator Heuristic (`VAL-UX-002`)**:
  * **Current implementation**: Triggers on any `.map()` call if the file does not reference `.length` or `EmptyState`.
  * **False Positive Rate observed**: 6 out of 16 findings (37.5%).
  * **Underlying cause**: Mapping over static config constants (`navGroups`, `COLOR_PRESETS`, `ICON_PRESETS`) or fixed mock arrays triggers the rule.
  * **Proposed improvement**: Refine the heuristic to ignore `.map()` calls on UPPER_CASE constants or variables imported from static configuration files.

---

## Execution Performance Report

All runs successfully completed within the frozen performance budget:

* **Repository Scan & AST Parsing**: Average execution time per file: **~3.5ms** (exceeds budget expectation of < 100ms).
* **Validation**: Total validation execution time across the largest subset (8 files) was **25ms** (budget was < 200ms).
* **Overall Execution**: The maximum run time recorded was **51ms** (budget was < 500ms).

---

## Rule Promotion Recommendations

> [!NOTE]
> Promotion recommendations are informational only and require a separate review and approval process before any rule severity or CI policy changes are made. No severity or CI policy changes have been executed during this milestone.

* **VAL-UI-020 (Alt Text Missing)**: High stability, zero false positives, critical accessibility impact. Recommended candidate for promotion to `FAIL_BUILD` (blocking) in CI after the advisory sprint.
* **VAL-UX-002 (Missing Empty State)**: Currently has high false-positive rate (37.5%) due to static constant arrays. Recommended to keep in `WARN` (advisory) and implement AST filter updates to exclude static uppercase arrays before any future promotion.
