## Context

Currently, the `BottomNavigation.tsx` component in `apps/web/src/components/layout` contains hand-rolled SVG components (`HomeIcon`, `TicketIcon`, `UserIcon`) embedded inline.
We have a shared UI library `@mad/ui` (in `packages/ui`) that exports icons via `@mad/ui/icons` utilizing the unified Lucide icon package.
Standardizing on `@mad/ui` icons guarantees visual consistency and aligns the mobile navigation bar with the visual token governance of UI-001.

## Goals / Non-Goals

**Goals:**
- Replace inline SVGs in `BottomNavigation.tsx` with shared icons `Home`, `Ticket`, and `User` imported from `@mad/ui/icons`.
- Maintain identical functionality, responsiveness, and safe-area spacing behaviors on mobile viewports.
- Keep the component size minimal and well-formatted.

**Non-Goals:**
- Adding new navigation links or changing routing logic.
- Redesigning the layout of the mobile navigation bar itself.

## Decisions

### Decision 1: Use `@mad/ui/icons` standard
- **Choice**: Import `Home`, `Ticket`, and `User` from `@mad/ui/icons` (or direct `@mad/ui` barrel).
- **Alternative**: Keep hand-rolled SVGs inline.
- **Rationale**: Keeps icon styling, line widths, and rounded caps 100% unified with other app pages and the general design system. Prevents code drift when icons are updated in the future.

## Risks / Trade-offs

- **[Risk]** Missing icon export in `@mad/ui/icons`
  - *Mitigation*: Ensure `Home` and `Ticket` are exported from `packages/ui/src/icons/index.ts` before updating the web app. If not, add them to the barrel file first.
