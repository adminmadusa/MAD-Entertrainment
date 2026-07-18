## ADDED Requirements

### Requirement: Localized Convenience Fee Calculation
The convenience fee and its associated tax SHALL be calculated dynamically based on the event's localized country configuration.

#### Scenario: Indian Event (INR)
- **WHEN** booking tickets for an event in India (`countryCode: "IN"`)
- **THEN** the convenience fee is calculated as ₹30 per ticket
- **AND** the tax on the convenience fee is calculated at 18%

#### Scenario: United States Event (USD)
- **WHEN** booking tickets for an event in the United States (`countryCode: "US"`)
- **THEN** the convenience fee is calculated as $2.00 per ticket
- **AND** the tax on the convenience fee is calculated at 0%
