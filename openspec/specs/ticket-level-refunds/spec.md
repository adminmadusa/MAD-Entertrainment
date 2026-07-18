# Ticket-Level Partial Refunds

## Purpose
TBD - Defines the requirements for initiating refunds at the ticket-level rather than booking-level.

## Requirements

### Requirement: Ticket-Level Partial Refunds
The system SHALL allow an admin to request a refund for specific tickets within a booking, rather than requiring the entire booking to be refunded.

#### Scenario: Admin requests refund for a single ticket
- **WHEN** an admin selects one ticket out of a multi-ticket booking and requests a partial refund
- **THEN** the system creates a Refund record with status 'requested' containing only that specific ticket ID

#### Scenario: Database prevents duplicate refund requests
- **WHEN** an admin requests a refund for a ticket that already has an active refund request
- **THEN** the database rejects the creation and the system returns an idempotency error
