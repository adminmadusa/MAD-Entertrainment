## 1. Setup and Preparation

- [x] 1.1 Create target fix/refactor branch or check status
- [x] 1.2 Verify working tree is clean before editing files

## 2. Skeleton Implementation

- [x] 2.1 Implement `CompletedEventsSkeleton` in `HomeSkeletons.tsx` matching grid columns, heights, and aspect ratios of completed events cards
- [x] 2.2 Update Suspense fallback for completed events in `apps/web/src/app/page.tsx` to use the new `CompletedEventsSkeleton`

## 3. Code Hygiene Optimization

- [x] 3.1 Remove redundant `import React` in `HomeSkeletons.tsx`
- [x] 3.2 Prefix unused `event` parameter as `_event` in `UpcomingEventsSection.tsx`
- [x] 3.3 Remove redundant assignment `const events = initialEvents;` in `CompletedEventsSection.tsx`

## 4. Build and Verification

- [x] 4.1 Run `pnpm run lint` and verify zero errors/warnings in edited components
- [x] 4.2 Run `pnpm run build` and ensure successful production compile
