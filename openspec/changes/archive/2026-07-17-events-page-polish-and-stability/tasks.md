## 1. Shared Domain Engine

- [x] 1.1 Add `EventLifecycle` and `BookingStatus` enums to `packages/shared/src/constants/index.ts`
- [x] 1.2 Implement the helper functions `deriveEventLifecycle`, `deriveBookingState`, `deriveGalleryState`, and `deriveCapabilities` in `packages/shared/src/utils/event-engine.ts`
- [x] 1.3 Refactor the existing engine `deriveBookingEligibility` in `packages/shared/src/utils/booking-eligibility.engine.ts` to serve as a compatibility wrapper delegating to the new orchestration layer

## 2. Backend Services & Aggregation

- [x] 2.1 Refactor the `GET /events` query handler in `apps/server/src/services/public/event.service.ts` to support optional `state=active|past|all` filters defaulting to `active`
- [x] 2.2 Add support for `sort=recommended&exclude=<eventId>` projection sorting weight in the events API query handler
- [x] 2.3 Implement lifecycle validation (`EventLifecycle === 'COMPLETED'`) in `AdminEventGalleryService.addItems` and `AdminEventGalleryService.updateSettings` in `apps/server/src/services/admin/event-gallery.service.ts`

## 3. Frontend Client & Dashboard Mappings

- [x] 3.1 Update `EventsList.tsx` in `apps/web/src/app/events/EventsList.tsx` to map active listings and semantic states to user-facing UI buttons/badges
- [x] 3.2 Add the pulsing `🟢 Live Now` indicator and declarative CTA mapping to `EventDetailClient.tsx` in `apps/web/src/app/events/[slug]/EventDetailClient.tsx`
- [x] 3.3 Update `PublicGalleryView.tsx` in `apps/web/src/app/events/[slug]/gallery/components/PublicGalleryView.tsx` to fetch upcoming event recommendations via the backend recommendation query
- [x] 3.4 Bind `capabilities.canUploadGallery` to disable upload zones in the Admin Dashboard user interface for upcoming/active events

## 4. Verification & Testing

- [x] 4.1 Write boundary test cases (timezone offsets, default duration, exact boundary points) in the shared package testing files
- [x] 4.2 Run monorepo type-checking, lint checks, and production builds (`pnpm build` and `pnpm lint`)
