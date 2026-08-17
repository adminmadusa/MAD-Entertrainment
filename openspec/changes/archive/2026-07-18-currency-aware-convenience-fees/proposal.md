## Why
To resolve the currency scaling issue where a flat fee of `30` is applied regardless of the currency (resulting in ₹30 for INR events but an excessive $30.00 for USD events). Introducing a localized convenience fee configuration ensures fees are proportional and appropriate for each market.

## What Changes
- Add `defaultConvenienceFee` to the shared `CountryConfig` type and mappings in `@mad/shared`.
- Update backend `BookingCreationService` to calculate convenience fees dynamically using the localized fee configuration of the event's country.
- Update relevant unit tests to reflect the localized calculations.

## Capabilities
### Modified Capabilities
- `booking-convenience-fee`: Localized convenience fee configuration and calculation

## Impact
**Shared**
- `packages/shared/src/utils/localization.ts` — add configuration field

**Backend (Server)**
- `apps/server/src/services/public/booking/booking-creation.service.ts` — update pricing calculations
