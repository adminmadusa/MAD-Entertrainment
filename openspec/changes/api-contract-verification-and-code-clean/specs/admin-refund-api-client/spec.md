## ADDED Requirements

### Requirement: Admin Refund API Client Module
The system SHALL provide a dedicated `refund.service.ts` module in the admin dashboard frontend (`apps/admin/src/lib/api/admin/`) that owns all refund-related HTTP calls to the backend, separate from the booking API client.

#### Scenario: Fetching refund list
- **WHEN** an admin navigates to the Refunds page in the admin dashboard
- **THEN** the frontend calls `adminGetRefunds()` imported from `refund.service.ts`, not from `booking.service.ts`

#### Scenario: Processing a refund
- **WHEN** a super_admin clicks the Approve button on a refund request
- **THEN** the frontend calls `adminProcessRefund()` imported from `refund.service.ts`, which sends a `PATCH /admin/refunds/:id/process` request to the backend

#### Scenario: Booking service remains focused
- **WHEN** a developer imports from `booking.service.ts`
- **THEN** they MUST only find booking-related operations (`getBookings`, `cancelBooking`, `getBookingById`, etc.) and no refund methods

#### Scenario: Backward compatibility during transition
- **WHEN** any existing component already imports `AdminRefund` type or refund functions from `booking.service.ts`
- **THEN** `booking.service.ts` SHALL re-export those symbols from `refund.service.ts` to prevent compilation breakage during the migration
