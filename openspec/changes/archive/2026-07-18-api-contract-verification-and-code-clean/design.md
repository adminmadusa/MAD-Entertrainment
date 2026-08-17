## Context

The MAD Entertrainment monorepo has three application layers that must stay in contract alignment:

1. **Backend** (`apps/server`) — Express controllers + service layer
2. **Admin Dashboard** (`apps/admin`) — Next.js app with `lib/api/admin/*.service.ts` clients
3. **Public Web** (`apps/web`) — Next.js app with `lib/api/public.service.ts` + `server.service.ts`

Over the course of implementing ticket-level partial refunds, the admin `booking.service.ts` frontend client grew to 315 lines and now owns both booking operations **and** refund operations (lines 62–284). The backend correctly separates these into `booking.controller.ts` and `refund.controller.ts`, but the frontend client has not been updated to mirror this boundary.

Additionally, the backend has both a flat `refund.service.ts` (224 lines) and a `refund/` subdirectory containing 5 sub-services. The flat file is a valid orchestration layer that delegates to the sub-services — this is correct, but it needs to be verified that no logic is duplicated between the two.

## Goals / Non-Goals

**Goals:**
- Extract refund-specific methods from `apps/admin/src/lib/api/admin/booking.service.ts` into a new `refund.service.ts`
- Verify that all admin API calls in the frontend map to a real backend endpoint with the correct HTTP method and path
- Verify that all public web API calls in `public.service.ts` map to real backend routes
- Identify and remove any unused imports, dead code, or unused exports in the audited files
- Ensure file sizes stay within governance limits (≤300 lines for services)

**Non-Goals:**
- Changing any business logic, pricing, or payment flows
- Changing database schemas or models
- Refactoring the backend service layer (which is already correctly structured)
- Any UI/UX changes

## Decisions

### Decision 1: Create `apps/admin/src/lib/api/admin/refund.service.ts`
**Why**: The current `booking.service.ts` violates the Single Responsibility Principle by also owning refund API calls. The backend already has a dedicated `refund.controller.ts`. The frontend client should mirror this boundary.  
**Alternative considered**: Keep everything in `booking.service.ts` — rejected because it hides the refund API surface inside a booking file, making it harder for developers to discover refund capabilities.

### Decision 2: Audit-first, fix-second
**Why**: Per governance rules, we must never modify production code without first establishing an evidence-based audit of what exists and what needs to change. The code-clean skill mandates this approach.  
**Alternative considered**: Skip audit and go straight to extraction — rejected because assumptions without evidence violate repository governance.

### Decision 3: Barrel re-export verification
**Why**: `apps/server/src/services/admin/booking.service.ts` is currently only 3 lines — a barrel file that re-exports from sub-services. We must verify it exports everything that controllers actually import, so nothing breaks when we clean other files.

## Risks / Trade-offs

- **Risk: Import breakage** → Every file that imports from `booking.service.ts` and uses refund methods must be updated to import from `refund.service.ts` instead. We will grep for all consumers before making the change.
- **Risk: Type duplication** → The `AdminRefund` interface lives in `booking.service.ts`. It must be moved or re-exported carefully. We will move the type to `refund.service.ts` and re-export it from `booking.service.ts` temporarily if needed to avoid breaking existing imports.
- **Risk: CI breakage** → If any unused import removal affects TypeScript compilation, the build will fail. We run `pnpm run type-check` and `pnpm run build` before committing.
