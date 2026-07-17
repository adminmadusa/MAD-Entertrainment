# Admin Dashboard Remediation

## Overview

Resolve all open findings from the Admin Dashboard Forensic Audit v1.5.0.
The audit identified critical WCAG AA contrast failures, table responsiveness
issues on tablet viewports, and a set of medium-priority UX/code quality
improvements. This change implements all findings across four sequential PRs
on the branch `feat/admin-dashboard-remediation`.

## Scope

**Apps affected:** `apps/admin`, `packages/ui`

**Files in scope:**
- `apps/admin/src/app/dashboard/page.tsx`
- `apps/admin/src/components/AdminSidebar.tsx`
- `apps/admin/src/app/users/page.tsx`
- `apps/admin/src/app/bookings/_components/BookingsTable.tsx`
- `apps/admin/src/app/team/_components/TeamTable.tsx`
- `apps/admin/src/app/refunds/page.tsx`
- `apps/admin/src/app/ticket-profiles/page.tsx`
- `apps/admin/src/components/dashboard/RevenueChartWidget.tsx`
- `packages/ui/src/composites/Table/Table.tsx`

**Out of scope:** Backend, auth flows, payment logic, shared design token values.

## Motivation

The forensic audit (v1.5.0) identified:
- WCAG AA contrast violations on normal text (3.44:1 vs required 4.5:1)
- Table columns squishing on 768–1024px viewports due to missing minimum width
- Missing keyboard focus rings on search inputs
- Raw emojis as UI icons causing rendering inconsistency
- Chart Y-axis overflow on small mobile screens
- ~85% duplicated pagination widgets across 3 table components

## Success Metrics

- All normal text contrast ≥ 4.5:1
- Zero clipped table columns at 768–1024px
- Zero raw emojis on admin dashboard
- ESLint / TypeScript / build: zero regressions
