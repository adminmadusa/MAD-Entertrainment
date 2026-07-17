# Tasks: Events Frontend Remediation

All changes are consolidated into a single Pull Request:
**PR Title:** `fix(events): remediate event lifecycle accessibility, responsiveness and UX`  
**Branch:** `feat/events-lifecycle-polish`

---

## Commit 1 — fix(events): improve accessibility contrast and focus visibility
Findings: E-A11Y-001, E-A11Y-002

- [x] **[Events] Upgrade contrast on directory text** (E-A11Y-001)
  - File: `apps/admin/src/app/events/page.tsx`
  - Upgrade `text-text-muted` → `text-text-secondary` on event slug, starts/ends dates, status badges, and delete button text.

- [x] **[Events] Add focus ring to directory search** (E-A11Y-002)
  - File: `apps/admin/src/app/events/page.tsx`
  - Add `focus:ring-2 focus:ring-accent-purple/50` to the search input element.

- [x] **[Forms] Add focus rings to form wizard inputs** (E-A11Y-002)
  - Files:
    - `apps/admin/src/components/events/EventBasicInfoCard.tsx`
    - `apps/admin/src/components/events/EventAdditionalDetailsCard.tsx`
    - `apps/admin/src/components/events/EventRequirementsCard.tsx`
    - `apps/admin/src/components/events/EventScheduleCard.tsx`
    - `apps/admin/src/components/events/EventTicketingCard.tsx`
    - `apps/admin/src/components/events/gallery/EventGallerySettingsPanel.tsx`
  - Add `focus:ring-2 focus:ring-accent-purple/50` to all text input, select, and textarea fields.

- [x] **[Commit 1] Verify and Commit**
  - Run quality gates: type-check, lint, build.
  - Commit message: `fix(events): improve accessibility contrast and focus visibility`

---

## Commit 2 — fix(events): improve responsive event table layout
Findings: E-UI-001

- [x] **[Events] Apply responsive table minimum width** (E-UI-001)
  - File: `apps/admin/src/app/events/page.tsx`
  - Apply table-specific minimum width based on intrinsic column width (approx. 900px if validated) to trigger horizontal scroll.

- [x] **[Commit 2] Verify and Commit**
  - Run quality gates: type-check, lint, build.
  - Commit message: `fix(events): improve responsive event table layout`

---

## Commit 3 — fix(events): prevent duplicate event submissions
Findings: E-UX-001

- [x] **[Wizards] Add double-submit guards to forms** (E-UX-001)
  - Files:
    - `apps/admin/src/app/events/new/page.tsx`
    - `apps/admin/src/app/events/[id]/edit/page.tsx`
  - Implement a synchronous `isSubmitting` `useRef` boolean guard on `handleSubmit` form submissions.

- [x] **[Commit 3] Verify and Commit**
  - Run quality gates: type-check, lint, build.
  - Commit message: `fix(events): prevent duplicate event submissions`

---

## Commit 4 — refactor(events): adopt shared table pagination component
Findings: E-GOV-001

- [x] **[Pre-condition] Verify pagination behavioral parity**
  - Confirm page size, queries, and filters on events directory align with standard pagination.

- [x] **[Events] Replace inline pagination** (E-GOV-001)
  - File: `apps/admin/src/app/events/page.tsx`
  - Replace inline pagination markup with the shared `<TablePagination>` component from `@mad/ui`.

- [x] **[Commit 4] Verify and Commit**
  - Run quality gates: type-check, lint, build.
  - Commit message: `refactor(events): adopt shared table pagination component`
