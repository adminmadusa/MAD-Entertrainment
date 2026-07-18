## Context

Currently, the admin dashboard allows cancelling a booking (which voids tickets) but leaves the financial refund as a manual, disconnected step. If an admin cancels a booking, they must remember to go to the Refunds tab and process a manual refund. Furthermore, refunds are tied to the overall `Booking` and `Payment`. If a user with 4 tickets checks in 3 tickets, but needs 1 ticket refunded, the system cannot process a ticket-level refund natively—the admin has to calculate it and do a generic partial refund. PRICING-003 blocks refunds for bookings with checked-in tickets, preventing this partial workflow without a `super_admin` manual override.

## Goals / Non-Goals

**Goals:**
- Provide a 1-click UI to request a refund for a booking or specific tickets within a booking.
- Decouple ticket status (voided) from booking status (cancelled) for granular partial refunds.
- Prevent double refunds via UI idempotency and database unique indices.
- Implement a 3-hour review window: Requested refunds wait 3 hours before they can be processed, giving super_admins time to verify or reject.

**Non-Goals:**
- Automatically executing gateway refunds immediately upon standard admin cancellation (super_admin approval is still required after 3 hrs).
- Refactoring the entire Payment schema.

## Decisions

**Decision 1: Ticket-Level Schema Modification**
- **Approach**: Add `ticketIds: Types.ObjectId[]` to `IRefund`.
- **Rationale**: Isolates the refund down to the specific tickets being voided. We can safely void `Ticket A` and leave `Ticket B` active.
- **Alternatives**: Create a new `TicketRefund` model (overly complex, splits the ledger).

**Decision 2: The 3-Hour Review Window**
- **Approach**: The refund enters `requested` status. A scheduled job (or UI check) prevents the `super_admin` from approving the refund until `createdAt + 3 hours` has passed.
- **Rationale**: Provides a cooling-off period to verify fraud, review the customer's claim, or allow the standard admin to reverse the cancellation if it was a mistake.

**Decision 3: Check-in Protection Override**
- **Approach**: Update `RefundValidationService`. If the requested `ticketIds` array is provided, the validation only checks `scannedAt` for those specific tickets, not the entire booking. If those specific tickets are scanned, it still requires the `super_admin` manual override.
- **Rationale**: Safe, granular validation.

## Risks / Trade-offs

- **Risk: Gateway Partial Refund Limits** → **Mitigation**: Ensure Stripe/Razorpay integrations are using valid partial refund logic and tracking cumulative refunds accurately against the original `paymentId`.
- **Risk: Race Conditions (Double Clicking)** → **Mitigation**: The `Refund` schema must enforce a unique index on `ticketIds` for any active refund request to reject duplicates at the database level.

## Migration Plan

1. Schema migration: Add `ticketIds` to the existing `Refund` collection as an optional array.
2. Code deployment: Deploy the modified `RefundValidationService` and `AdminRefundsPage` UI.
3. No data backfill needed, as existing refunds were full-booking refunds.
