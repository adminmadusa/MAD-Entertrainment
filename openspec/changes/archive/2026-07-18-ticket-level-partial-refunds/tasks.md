## 1. Schema & Validation Updates

- [x] 1.1 Update `IRefund` schema in `refund.schema.ts` to include `ticketIds?: Types.ObjectId[]` and create a unique compound index for active ticket refunds to prevent duplicates.
- [x] 1.2 Update `RefundValidationService.validateRefundProcessingConstraints` to evaluate check-in protection only for the provided `ticketIds` if present, skipping validation for the whole booking.
- [x] 1.3 Update `RefundValidationService` to enforce the 3-hour minimum wait time constraint when a `super_admin` attempts to process a refund.

## 2. Admin Backend API Updates

- [x] 2.1 Update the `adminCreateRefundRequest` controller/service (or equivalent initiation API) to accept an array of `ticketIds` and persist them into the `Refund` record with status `requested`.
- [x] 2.2 Ensure the cancellation process automatically creates the `Refund` request rather than expecting a disconnected manual request.
- [x] 2.3 Modify the gateway refund execution logic in `RefundGatewayService` to correctly handle partial refunds without attempting to cancel untargeted tickets.

## 3. UI Dashboard Updates (Frontend)

- [x] 3.1 Update the Booking Details page to include checkboxes next to each Ticket for specific selection during cancellation.
- [x] 3.2 Implement a "Request Refund" prompt/modal that asks the admin for the refund amount when they cancel selected tickets.
- [x] 3.3 Ensure the "Request Refund" button immediately disables and goes into a loading state after one click to prevent double submission (UI idempotency).
- [x] 3.4 Update `AdminRefundsPage` to display the specific `ticketIds` associated with the refund request, instead of just the Booking ID.
- [x] 3.5 Display a 3-hour lock/countdown in `AdminRefundsPage` for any refund where `createdAt` is less than 3 hours ago, disabling the "Approve" button for `super_admin`.

## 4. Testing & Verification

- [x] 4.1 Test standard booking cancellation creates correct refund request without executing it.
- [x] 4.2 Test double-click / race condition prevention for the same ticket.
- [x] 4.3 Test super_admin check-in override ONLY applies to the targeted tickets.
- [x] 4.4 Verify 3-hour lock behavior in the dashboard UI and backend API.
