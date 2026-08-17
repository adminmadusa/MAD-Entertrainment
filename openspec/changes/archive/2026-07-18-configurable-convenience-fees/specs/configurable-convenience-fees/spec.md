## ADDED Requirements

### Requirement: Custom Convenience Fee Override
Admins SHALL be able to define an optional custom convenience fee rate per ticket when creating or updating an event.

#### Scenario: Admin sets custom fee
- **WHEN** an event is created/updated with `convenienceFee: 5.00`
- **THEN** the system applies a fee of $5.00 per ticket during checkout
- **AND** the convenience fee tax matches 18% of $5.00 (i.e. $0.90) for IN events, or 0% for US events

#### Scenario: Admin leaves fee empty
- **WHEN** an event is created/updated with an empty convenience fee field
- **THEN** the system falls back to the default country configuration convenience fee rate (e.g. ₹30 for IN, $2.00 for US)
