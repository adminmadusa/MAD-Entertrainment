## 1. Database & Schema Updates
- [x] 1.1 In `apps/server/src/models/event.schema.ts`, add `convenienceFee` field to the schema and interface
- [x] 1.2 In `apps/server/src/validations/event.validation.ts`, add `convenienceFee` to `eventBodySchema` as an optional numeric field

## 2. Server Logic Updates
- [x] 2.1 In `apps/server/src/services/public/booking/booking-creation.service.ts`, prioritize `event.convenienceFee` over `countryConfig.defaultConvenienceFee` if defined

## 3. Admin Client Updates
- [x] 3.1 In `apps/admin/src/lib/api/admin/event.service.ts`, add `convenienceFee` to the `AdminEvent` interface
- [x] 3.2 In `apps/admin/src/components/events/EventBasicInfoCard.tsx`, add new convenience fee numeric input prop and field input UI
- [x] 3.3 In `apps/admin/src/components/events/EventForm.tsx`, bind the `convenienceFee` state and serialize it in payload submission

## 4. Verification
- [x] 4.1 Run `pnpm run type-check` — zero TypeScript errors
- [x] 4.2 Run `pnpm run lint` — zero lint warnings
- [x] 4.3 Run `pnpm run test` — verify all tests pass
