## Context
The legacy fingerprint calculation in `BookingCreationService.createBooking` was designed to handle incoming retries of bookings created before the `selectionFingerprint` field was added. However, the fingerprint is now standard. Keeping the fallback adds dead code and complexity.

## Goals / Non-Goals
**Goals**:
- Remove the manual fallback calculation from `BookingCreationService`
- Ensure tests still pass.

**Non-Goals**:
- Database migrations or schema updates.

## Decisions
### Decision 1: Safe expiration fallback
If a legacy booking without a fingerprint is retrieved, it will fail the strict `existingBooking.selectionFingerprint === requestFingerprint` comparison and fall through to the expiration flow. It will be expired and recreated with the fingerprint. This is standard behavior and perfectly safe.
