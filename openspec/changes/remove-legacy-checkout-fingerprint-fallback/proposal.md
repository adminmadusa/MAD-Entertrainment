## Why
To clean up legacy technical debt within the booking checkout flow by removing the backward-compatibility fallback logic that re-calculates selection fingerprints for legacy bookings. All bookings in staging and production now have `selectionFingerprint` populated at creation time.

## What Changes
- Remove the inline fallback calculation of `selectionFingerprint` in `BookingCreationService.createBooking` on the backend.
- Rely strictly on the `selectionFingerprint` property on the retrieved booking document during checkout retry checks.

## Capabilities
### Modified Capabilities
- `booking-checkout-fingerprint`: Cleaned check logic inside `BookingCreationService`

## Impact
**Backend (Server)**
- `apps/server/src/services/public/booking/booking-creation.service.ts` — primary change

**No changes to:**
- Frontend client
- Database schema
- Payment webhook handlers
