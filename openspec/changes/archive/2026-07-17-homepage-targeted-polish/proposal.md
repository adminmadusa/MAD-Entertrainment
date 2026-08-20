## Why

The user frontend homepage has visual UX issues and code quality discrepancies:
1. Fallback Loading States: CompletedEventsSection currently shares the UpcomingEventsSkeleton (designed for a 3D Cover Flow Carousel layout with CTA button shimmers), which differs from CompletedEventsSection's static grid layout (without active CTA buttons). This mismatch leads to visual layout shift upon data hydration.
2. Code Hygiene: Redundant React imports, unused callback arguments, and redundant local variables are present in the homepage components, generating linting clutter.

This change aims to polish these issues in targeted, low-risk iterations.

## What Changes

- Introduce a new `CompletedEventsSkeleton` mirroring the flat card grid, aspect ratios, and visual boundaries of the past events recap.
- Apply this new skeleton as the Suspense fallback for the completed events section on the homepage.
- Clean up unused imports, unused parameters, and redundant assignments in the homepage and related components (`HomeSkeletons.tsx`, `UpcomingEventsSection.tsx`, and `CompletedEventsSection.tsx`).

## Capabilities

### New Capabilities
- `homepage-optimizations`: UI/UX enhancements and code clean optimizations for the homepage component hierarchy, including targeted skeleton states and code hygiene improvements.

### Modified Capabilities
<!-- None -->

## Impact

- **Affected Code**:
  - `apps/web/src/app/page.tsx`
  - `apps/web/src/components/ui/HomeSkeletons.tsx`
  - `apps/web/src/components/ui/UpcomingEventsSection.tsx`
  - `apps/web/src/components/ui/CompletedEventsSection.tsx`
- **APIs**: No changes to frontend-backend API contracts.
- **Dependencies**: No new packages or dependencies added.
