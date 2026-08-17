## Why

The MAD Entertrainment monorepo has accumulated several layers of new features (ticket-level refunds, unified media upload, partial booking cancellation). Before building the next major feature, we need a systematic code-clean pass to verify that all three layers (backend API, admin dashboard, public web frontend) are correctly aligned, that there are no orphan API client methods, no duplicate service logic, and no dead code left from previous refactors.

## What Changes

- Verify and fix frontend–backend API contract alignment for all admin and public endpoints
- Remove or consolidate any orphan, duplicate, or misplaced refund-related methods in the admin frontend (`booking.service.ts` currently houses refund methods that logically belong in a dedicated `refund.service.ts`)
- Audit and clean unused imports, unused variables, and dead code across controllers, services, and frontend API clients
- Verify the `apps/server/src/services/admin/booking.service.ts` barrel file is not hiding broken re-exports
- Ensure `apps/web/src/lib/api/public.service.ts` (340 lines) and `apps/admin/src/lib/api/admin/booking.service.ts` (315 lines) are within governance size limits and have no dead code

## Capabilities

### New Capabilities
- `admin-refund-api-client`: A dedicated `refund.service.ts` in the admin dashboard frontend to own all refund-related API calls, extracted from the current `booking.service.ts`

### Modified Capabilities
- None — this is a structural cleanup only; no spec-level behavior changes

## Impact

**Backend (Server)**
- `apps/server/src/controllers/admin/booking.controller.ts`
- `apps/server/src/controllers/admin/refund.controller.ts`
- `apps/server/src/services/admin/booking.service.ts` (barrel — 3 lines, verify completeness)
- `apps/server/src/services/admin/refund.service.ts` (224 lines — verify it is not duplicating refund/ subdirectory services)

**Admin Dashboard Frontend**
- `apps/admin/src/lib/api/admin/booking.service.ts` (315 lines — refund methods to be extracted)
- New: `apps/admin/src/lib/api/admin/refund.service.ts`

**Public Web Frontend**
- `apps/web/src/lib/api/public.service.ts` (340 lines — audit for dead code and unused exports)
- `apps/web/src/lib/api/server.service.ts` — verify ISR/server-side fetch methods are aligned with backend routes

**No changes to:**
- Database schemas
- Auth / payment / booking business logic
- Any public-facing UI components
