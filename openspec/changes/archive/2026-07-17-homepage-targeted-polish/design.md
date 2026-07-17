## Context

The user frontend homepage components currently have a layout shift visual defect during loading states (CompletedEventsSection loads with a carousel-style skeleton instead of a grid skeleton) and some linter warnings about unused variables, parameters, and React imports.

## Goals / Non-Goals

**Goals:**
- Implement a custom `CompletedEventsSkeleton` that mirrors the grid structure of the past events recap layout.
- Clean up unused variables, parameters, and imports across audited homepage files to ensure zero linter warnings.
- Maintain existing codebase architectures, packages, and frameworks.

**Non-Goals:**
- No refactoring or splitting of `UpcomingEventsSection.tsx` (will remain in its current file size).
- No renaming of utility or hook files (e.g. `image-loader.ts` or `use-checkout-viewport-controller.ts`) to avoid cross-cutting PR noise and merge conflicts.
- No changes to API endpoints, payload contracts, or database schemas.

## Decisions

### Decision 1: Create a dedicated CompletedEventsSkeleton component
- **Rationale**: The completed events section uses a standard `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`. Using the carousel-based `UpcomingEventsSkeleton` introduces a structural mismatch during loading. We will define `CompletedEventsSkeleton` in `HomeSkeletons.tsx` to replicate three grid cards (image container aspect-[4/3], details padding, no CTA button shimmers) to ensure visually stable transition on hydration.
- **Alternatives Considered**: Using a generic skeleton container. Rejected because it wouldn't match the specific grid layouts and aspect ratios.

### Decision 2: Target specific, low-risk code hygiene cleanups
- **Rationale**:
  - Remove `import React from 'react'` in `HomeSkeletons.tsx` (obsolete with modern React JSX runtime).
  - Rename `event` to `_event` in `UpcomingEventsSection.tsx` `handleDragEnd` callback to explicitly mark it as unused and satisfy linters.
  - Remove redundant `const events = initialEvents` assignment in `CompletedEventsSection.tsx` and map directly over `initialEvents`.
- **Alternatives Considered**: Ignore the warnings. Rejected because zero warnings is a project constraint.

## Risks / Trade-offs

- **[Risk]** Mismatched placeholder sizes causing layout shifts.
  - **Mitigation** Use exact CSS classes on `CompletedEventsSkeleton` as those in `CompletedEventsSection.tsx` (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6` and card heights of `h-[400px] sm:h-[450px]`).
