## Context
The convenience fee is currently fixed at `30` units per ticket on the backend. This works well for India (₹30), but is too high for the US ($30.00).

## Goals / Non-Goals
**Goals**:
- Configure country-specific default convenience fees in localization.
- Calculate convenience fees dynamically based on the event's country code.
- Align convenience fee tax (GST/Sales Tax) with the event's localized tax rate.

## Decisions
### Decision 1: Localization Mappings
Add `defaultConvenienceFee` to `CountryConfig`:
- **US**: `defaultConvenienceFee: 2` (equivalent to $2.00 per ticket)
- **IN**: `defaultConvenienceFee: 30` (equivalent to ₹30 per ticket)

### Decision 2: Tax Calculation Alignment
Instead of a hardcoded 18% tax on the convenience fee, scale it with the event/country's tax percentage:
```typescript
const taxPercentage = event.taxPercentage !== undefined ? event.taxPercentage : countryConfig.defaultTax;
const convenienceFeeGst = Math.round((convenienceFee * taxPercentage) / 100);
```
This ensures:
- For US events (0% sales tax default): $0.00 tax is charged on the convenience fee.
- For IN events (18% GST default): 18% tax is charged on the convenience fee.
