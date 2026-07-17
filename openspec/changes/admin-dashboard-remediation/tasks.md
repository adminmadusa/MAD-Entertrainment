# Tasks: Admin Dashboard Remediation

Sourced from Implementation Plan v1.5.0 (4-PR sequence).
Branch: `feat/admin-dashboard-remediation`

---

## PR 1 — Accessibility: Contrast, Focus & Semantics
Findings: A11Y-001, A11Y-002, A11Y-003, A11Y-004

- [x] **[packages/ui] Add `scope="col"` to `TableHead` component** (A11Y-003)
  - File: `packages/ui/src/composites/Table/Table.tsx`
  - Add `scope="col"` prop to the `<th>` element inside `TableHead` forwardRef

- [x] **[AdminSidebar] Upgrade contrast + add aria-label** (A11Y-001, A11Y-004)
  - File: `apps/admin/src/components/AdminSidebar.tsx`
  - Upgrade `text-text-muted` → `text-text-secondary` on section headers and nav item subtexts
  - Add `aria-label` to icon-only collapse/expand toggle buttons

- [x] **[Dashboard] Upgrade contrast + search focus ring** (A11Y-001, A11Y-002)
  - File: `apps/admin/src/app/dashboard/page.tsx`
  - Upgrade `text-text-muted` → `text-text-secondary` on metric card secondary text
  - Add `focus:ring-2 focus:ring-accent-purple/50 focus:outline-none` to global search input

- [x] **[Users] Upgrade contrast + search focus ring** (A11Y-001, A11Y-002)
  - File: `apps/admin/src/app/users/page.tsx`
  - Upgrade `text-text-muted` → `text-text-secondary` on user email cells (line 155)
  - Add focus ring to search input (line 317)

- [x] **[BookingsTable] Upgrade customer email contrast** (A11Y-001)
  - File: `apps/admin/src/app/bookings/_components/BookingsTable.tsx`
  - Upgrade `text-text-muted` → `text-text-secondary` on customer email cells (line 94)

- [x] **[TeamTable] Upgrade admin email contrast** (A11Y-001)
  - File: `apps/admin/src/app/team/_components/TeamTable.tsx`
  - Upgrade `text-text-muted` → `text-text-secondary` on admin email cells (line 90)

- [x] **[PR 1] Commit and verify**
  - Run: `pnpm run type-check && pnpm run lint && pnpm test && pnpm build`
  - Commit message: `fix(admin): accessibility — contrast, focus, and table semantics (A11Y-001–004)`

---

## PR 2 — Responsiveness: Table Min-Width
Findings: UI-001, UI-002

- [x] **[BookingsTable] Add min-width** (UI-001)
  - File: `apps/admin/src/app/bookings/_components/BookingsTable.tsx`
  - Add `min-w-[900px]` class to inner table wrapper

- [x] **[Users] Add min-width** (UI-001)
  - File: `apps/admin/src/app/users/page.tsx`
  - Add `min-w-[900px]` class to users table inner node

- [x] **[TeamTable] Add min-width** (UI-001)
  - File: `apps/admin/src/app/team/_components/TeamTable.tsx`
  - Add `min-w-[800px]` class to team table inner node (6 columns)

- [x] **[Refunds] Add min-width** (UI-001)
  - File: `apps/admin/src/app/refunds/page.tsx`
  - Add `min-w-[900px]` class to refunds table inner node

- [x] **[TicketProfiles] Add min-width** (UI-001)
  - File: `apps/admin/src/app/ticket-profiles/page.tsx`
  - Add `min-w-[700px]` class to ticket-profiles table inner node

- [x] **[PR 2] Commit and verify**
  - Run: `pnpm run type-check && pnpm run lint && pnpm test && pnpm build`
  - Verify at 768px, 820px, 1024px: no clipped columns, horizontal scroll appears correctly
  - Commit message: `fix(admin): table responsiveness — add min-width to prevent column squishing (UI-001)`

---

## PR 3 — Dashboard Polish: Icons, Chart, UX Fixes
Findings: UI-003, PERF-001, PERF-002, GOV-003, GOV-004, UX-001

- [x] **[Dashboard] Replace raw emojis with SVG icons** (UI-003)
  - File: `apps/admin/src/app/dashboard/page.tsx`
  - Replace all raw emoji characters with `@mad/ui/icons` equivalents

- [x] **[RevenueChart] Fix Y-axis truncation on mobile** (PERF-001)
  - File: `apps/admin/src/components/dashboard/RevenueChartWidget.tsx`
  - Apply locale-aware shortening in `tickFormatter` for values > 99,999

- [x] **[RevenueChart] Fix tooltip label contrast** (PERF-002)
  - File: `apps/admin/src/components/dashboard/RevenueChartWidget.tsx`
  - Upgrade tooltip date label from `text-text-muted` → `text-text-secondary`

- [x] **[AdminSidebar] Persist collapse state to localStorage** (GOV-004)
  - File: `apps/admin/src/components/AdminSidebar.tsx`
  - Read/write `admin_sidebar_collapsed` in localStorage on toggle

- [x] **[Refunds] Add double-submit guard** (UX-001)
  - File: `apps/admin/src/app/refunds/page.tsx`
  - Add in-flight boolean ref to prevent duplicate bulk refund submissions

- [x] **[PR 3] Commit per concern and verify**
  - Commit 1: `fix(dashboard): replace raw emojis with vector SVG icons (UI-003)`
  - Commit 2: `fix(dashboard): chart Y-axis shortening and tooltip contrast (PERF-001, PERF-002)`
  - Commit 3: `fix(admin): persist sidebar collapsed state to localStorage (GOV-004)`
  - Commit 4: `fix(refunds): add in-flight guard to prevent duplicate bulk submissions (UX-001)`
  - Run: `pnpm run type-check && pnpm run lint && pnpm test && pnpm build`

---

## PR 4 — Refactor: Shared Pagination Extraction (Deferred)
Finding: GOV-002
**Pre-condition:** PR 2 merged & verified. Behavioral parity confirmed.

- [ ] **[Pre-condition] Verify pagination behavioral parity**
  - Confirm all three tables (bookings, users, team) use offset-based pagination
  - Confirm identical `onPageChange` signatures and no divergent selection/reset behavior

- [ ] **[packages/ui] Create shared `TablePagination` component**
  - New file: `packages/ui/src/composites/Pagination/Pagination.tsx`
  - Export from `@mad/ui` barrel

- [ ] **[BookingsTable] Replace inline pagination** (GOV-002)
  - File: `apps/admin/src/app/bookings/_components/BookingsTable.tsx`
  - Replace lines 185–207 with `<TablePagination>` import

- [ ] **[Users] Replace inline pagination** (GOV-002)
  - File: `apps/admin/src/app/users/page.tsx`
  - Replace lines 364–387 with `<TablePagination>` import

- [ ] **[TeamTable] Replace inline pagination** (GOV-002)
  - File: `apps/admin/src/app/team/_components/TeamTable.tsx`
  - Replace lines 180–202 with `<TablePagination>` import

- [ ] **[PR 4] Commit and verify**
  - Run: `pnpm run type-check && pnpm run lint && pnpm test && pnpm build`
  - Verify pagination at first, middle, and last pages on all three tables
  - Commit message: `refactor(ui): extract shared TablePagination component from admin tables (GOV-002)`
