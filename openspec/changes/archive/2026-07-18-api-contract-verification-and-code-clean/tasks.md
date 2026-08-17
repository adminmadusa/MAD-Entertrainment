## 1. Pre-Implementation Audit

- [x] 1.1 Grep all consumers of `booking.service.ts` in `apps/admin/src` to identify every file that imports refund-related methods or the `AdminRefund` type
- [x] 1.2 Verify all admin refund API calls (`adminGetRefunds`, `adminProcessRefund`, `adminCancelBooking` with ticketIds) map to real backend routes in `refund.controller.ts` and `booking.controller.ts`
- [x] 1.3 Verify all public web API calls in `apps/web/src/lib/api/public.service.ts` map to real backend routes in the public controllers
- [x] 1.4 Audit `apps/server/src/services/admin/refund.service.ts` (224 lines) vs the `refund/` subdirectory — confirm no logic duplication between the flat file and sub-services
- [x] 1.5 Check the `apps/server/src/services/admin/booking.service.ts` barrel (3-line re-export) is complete and exports everything controllers need

## 2. Create Admin Refund API Client

- [x] 2.1 Create `apps/admin/src/lib/api/admin/refund.service.ts` with the `AdminRefund` interface and all refund-specific functions extracted from `booking.service.ts`
- [x] 2.2 Remove the `AdminRefund` interface and refund functions from `booking.service.ts`, adding re-exports pointing to the new `refund.service.ts` for backward compatibility
- [x] 2.3 Update every admin component that directly imports refund symbols from `booking.service.ts` to import from `refund.service.ts`
- [x] 2.4 Remove the backward-compatible re-exports from `booking.service.ts` once all consumers are updated

## 3. Dead Code & Import Cleanup

- [x] 3.1 Remove all unused imports from `apps/admin/src/lib/api/admin/booking.service.ts` after extraction
- [x] 3.2 Remove all unused imports and dead exports from `apps/web/src/lib/api/public.service.ts`
- [x] 3.3 Remove any unused imports from `apps/web/src/lib/api/server.service.ts`
- [x] 3.4 Verify no `console.log` or debug statements remain in any audited file

## 4. Verification

- [x] 4.1 Run `pnpm run type-check` — zero TypeScript errors
- [x] 4.2 Run `pnpm run lint` — zero lint warnings in audited files
- [x] 4.3 Run `pnpm run build` — successful build for all three apps (`server`, `admin`, `web`)
- [ ] 4.4 Manually verify the Refunds page in the admin dashboard still loads and processes refunds correctly
