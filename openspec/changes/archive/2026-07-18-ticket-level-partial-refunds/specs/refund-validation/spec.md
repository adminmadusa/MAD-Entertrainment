## ADDED Requirements

### Requirement: Ticket-Granular Check-in Validation
The system SHALL validate check-in status (PRICING-003) only for the specific tickets being refunded, rather than the entire booking.

#### Scenario: Refunding an unscanned ticket in a partially scanned booking
- **WHEN** a booking has Ticket A (scanned) and Ticket B (unscanned), and a refund is requested for Ticket B
- **THEN** the system allows the refund without requiring a super_admin manual override

#### Scenario: Refunding a scanned ticket
- **WHEN** a refund is requested for Ticket A (scanned)
- **THEN** the system blocks the refund and requires a super_admin manual override and justification
