## Context
Admins need the ability to customize convenience fees on a per-event basis. The system should still fall back to country defaults when no custom fee is configured.

## Goals / Non-Goals
**Goals**:
- Provide an admin UI control for configuring event convenience fees.
- Persist custom convenience fees in MongoDB.
- Leverage custom fees in the booking creation pricing engine.

**Non-Goals**:
- Managing convenience fees globally on a separate admin settings page (this is event-specific).

## Decisions
### Decision 1: Booking Price Engine Fallback
In `BookingCreationService.createBooking`, determine the base fee as:
```typescript
const baseFee = event.convenienceFee !== undefined ? event.convenienceFee : countryConfig.defaultConvenienceFee;
const convenienceFee = baseFee * totalTicketsCount;
```
This guarantees backwards compatibility: if `event.convenienceFee` is not set (e.g. for existing events in the database), it seamlessly falls back to the dynamic country defaults.

### Decision 2: Admin UI Form Field
Add a numeric input field inside `EventBasicInfoCard` that displays the current active currency unit. If the input is left empty by the admin, it is submitted as `undefined` so that the default country configuration is used instead of a fixed override.
