## Why

The current booking cancellation and refund processes are detached. When an admin cancels a booking, tickets are voided but funds are not automatically requested for a refund, creating a risk where customers lose access but do not receive their money. Furthermore, the system only supports booking-level refunds, making it impossible to partially refund specific checked-in attendees without manual database/gateway intervention. This change implements isolated, ticket-level partial refunds with proper check-in protection, idempotency, and a 3-hour verification window.

## What Changes

- Add a UI mechanism in the admin dashboard to request refunds for specific tickets within a booking.
- Link the cancellation and refund workflows into a single 1-click "Request Refund" action.
- Update the `Refund` schema to explicitly reference `ticketIds` for isolation.
- Implement a 3-hour review window where requested refunds wait before execution.
- Implement UI idempotency (disabling buttons) and database uniqueness constraints to prevent double refunds.
- Refine check-in protection: allow super admins to override the check-in lock for specific `ticketIds` while safely voiding them.
- Cleanly remove any deprecated or duplicate refund UI/logic from the admin dashboard to prevent dead code.

## Capabilities

### New Capabilities
- `ticket-level-refunds`: Granular tracking and execution of partial refunds tied to specific ticket IDs rather than whole bookings.
- `refund-review-window`: A 3-hour delay mechanism between refund request generation and gateway execution.

### Modified Capabilities
- `refund-validation`: Modifying PRICING-003 to handle ticket-level check-in protection overrides safely.

## Impact

- **Models**: `Refund` schema (`ticketIds` array added).
- **Services**: `RefundValidationService`, `RefundLifecycleService`, and `BookingLifecycleService`.
- **Admin UI**: Booking Details page and Refunds Dashboard.
- **Gateways**: Stripe/Razorpay integrations must correctly process isolated partial amounts while maintaining their existing idempotency keys.
