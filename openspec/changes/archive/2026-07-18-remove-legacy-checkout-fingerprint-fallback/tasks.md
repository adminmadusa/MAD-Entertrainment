## 1. Implement Clean Fingerprint Validation
- [x] 1.1 In `apps/server/src/services/public/booking/booking-creation.service.ts`, remove the fallback generation of `existingFingerprint`
- [x] 1.2 Simplify comparison check to only use `existingBooking.selectionFingerprint`
- [x] 1.3 Remove any block that updates missing selectionFingerprint on existing bookings during checkout reuse

## 2. Verification
- [x] 2.1 Run `pnpm run type-check` — zero TypeScript errors
- [x] 2.2 Run `pnpm run lint` — zero lint warnings
- [x] 2.3 Run `pnpm run test` — all unit tests pass
