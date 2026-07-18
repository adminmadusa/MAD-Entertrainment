## 1. Shared Package Changes
- [x] 1.1 In `packages/shared/src/utils/localization.ts`, add `defaultConvenienceFee: number` to `CountryConfig` interface
- [x] 1.2 In `COUNTRY_CONFIG`, define `defaultConvenienceFee` as `2` for `US` and `30` for `IN`

## 2. Server Changes
- [x] 2.1 In `apps/server/src/services/public/booking/booking-creation.service.ts`, fetch the event's localized `countryConfig`
- [x] 2.2 Calculate `convenienceFee` dynamically: `countryConfig.defaultConvenienceFee * totalTicketsCount`
- [x] 2.3 Calculate `convenienceFeeGst` using the event/country tax percentage instead of hardcoded 18%

## 3. Verification
- [x] 3.1 Run `pnpm run type-check` — zero TypeScript errors
- [x] 3.2 Run `pnpm run lint` — zero lint warnings
- [x] 3.3 Run `pnpm run test` — verify that all tests pass, and update any expectations in tests where necessary
