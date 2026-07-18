## Why
To allow the admin team to control and modify the convenience fee per event, rather than relying on hardcoded defaults. This provides flexibility to charge different convenience fees based on specific event tiers, pricing structures, or promotions.

## What Changes
- **Database Schema**: Add `convenienceFee` field to the `Event` model.
- **Server API**: Update validation schemas (`createEventSchema` & `updateEventSchema`) to allow configuring the `convenienceFee`.
- **Server Logic**: Update checkout price calculations to prioritize the event-specific `convenienceFee` over the default localization rate.
- **Admin App**: Add an input field for the convenience fee in `EventBasicInfoCard` and update the event creation/editing payloads.

## Capabilities
### Modified Capabilities
- `event-convenience-fee-config`: Dynamic convenience fee management by admins

## Impact
**Backend (Server)**
- `apps/server/src/models/event.schema.ts` — schema updates
- `apps/server/src/validations/event.validation.ts` — validation schema updates
- `apps/server/src/services/public/booking/booking-creation.service.ts` — fallback priority calculation

**Frontend (Admin App)**
- `apps/admin/src/lib/api/admin/event.service.ts` — type updates
- `apps/admin/src/components/events/EventBasicInfoCard.tsx` — UI input field
- `apps/admin/src/components/events/EventForm.tsx` — state management and payload submission
