# Tasks: Event Overview Accessibility

All changes are consolidated into a single Pull Request:
**PR Title:** `fix(events): improve event overview accessibility and drawer interaction`
**Branch:** `feat/event-overview-read-more-a11y`

---

## Commit 1 — chore(events): merge develop and resolve conflicts
Special Task: Commit local conflict resolution after merging develop.

- [x] **[Conflict] Merge develop and resolve conflicts**
  - Merge develop branch into the active branch. Resolve conflicts in `EventOverview.tsx` (retaining `safeDescription` checks) and `Drawer.tsx`.

- [x] **[Commit 1] Verify and Commit**
  - Run compile/lint quality gates.
  - Commit message: `chore(events): merge develop and resolve conflicts`

---

## Commit 2 — fix(events): improve overview accessibility semantics
Findings: EO-A11Y-001, EO-A11Y-002

- [x] **[Overview] Upgrade subtext contrast** (EO-A11Y-001)
  - File: `apps/web/src/app/events/[slug]/components/EventOverview.tsx`
  - Upgrade `text-text-muted` → `text-text-secondary` for "Event Organizer" label.

- [x] **[Overview] Add disclosure relationship ARIA bindings** (EO-A11Y-002)
  - File: `apps/web/src/app/events/[slug]/components/EventOverview.tsx`
  - Add `aria-expanded`, `aria-haspopup="dialog"`, and `aria-controls="event-overview-drawer"` to the trigger button. Add `focus:ring-2 focus:ring-accent-cyan/50` to the trigger.

- [x] **[Commit 2] Verify and Commit**
  - Run compile/lint quality gates.
  - Commit message: `fix(events): improve overview accessibility semantics`

---

## Commit 3 — fix(ui): improve drawer accessibility and reduced motion
Findings: EO-A11Y-003, EO-UX-001

- [x] **[Drawer] Support scroll-locking centrally** (EO-UX-001)
  - File: `packages/ui/src/composites/Drawer/Drawer.tsx` and `Drawer.types.ts`
  - Expose `lockScroll?: boolean` prop defaulting to `true` and implement body overflow locking logic on mount/unmount.

- [x] **[Drawer] Support custom container IDs & focus restoration** (EO-A11Y-003)
  - File: `packages/ui/src/composites/Drawer/Drawer.tsx`
  - Expose `id?: string` prop and apply to container. Store triggering element reference and restore focus on close.

- [x] **[Drawer] Implement reduced motion & accessible title bindings** (EO-A11Y-003)
  - Files:
    - `packages/ui/src/composites/Drawer/Drawer.tsx`
    - `packages/ui/src/composites/Drawer/Drawer.styles.ts`
  - Add `motion-reduce:transition-none` to drawer style transitions. Add `aria-labelledby` mapping to the dialog wrapper.

- [x] **[Commit 3] Verify and Commit**
  - Run compile/lint quality gates.
  - Commit message: `fix(ui): improve drawer accessibility and reduced motion`

---

## Commit 4 — fix(events): improve overview drawer interaction
Findings: EO-UI-001

- [x] **[Overview] Upgrade touch targets** (EO-UI-001)
  - File: `apps/web/src/app/events/[slug]/components/EventOverview.tsx`
  - Add `min-h-[44px] py-2 flex items-center` to disclosure button without altering layout.

- [x] **[Commit 4] Verify and Commit**
  - Run compile/lint quality gates and full pnpm build.
  - Commit message: `fix(events): improve overview drawer interaction`
