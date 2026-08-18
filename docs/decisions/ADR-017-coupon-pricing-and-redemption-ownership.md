# ADR-017: Coupon Pricing Calculation and Redemption Ownership Invariants

## Metadata
- **Status**: Implemented
- **Date**: 2026-08-18
- **Authors**: Repository Architecture Team
- **Reviewers**: Financial Domain Tech Lead, Software Architecture Group
- **Decision Category**: Architecture / Payments / API
- **Related Documents**:
  - [ARCHITECTURE.md](../../ARCHITECTURE.md) (System Boundaries & SSOT Ownership Matrix)
  - [API_CONTRACTS.md](../../API_CONTRACTS.md) (Booking & Coupon API Contracts)
  - [ADR-001 (Booking Ownership)](ADR-001-booking-ownership.md)
- **Related GitHub Issues**: None
- **Related Pull Requests**: #699

---

## Context
The MAD Entertrainment platform provides dynamic Promo Code / Discount capabilities across checkout and event booking flows. Coupon redemptions, maximum discount limits, minimum order constraints, and tax calculations must be executed reliably across concurrent user sessions.

Previously, client checkouts and background services had subtle calculation order ambiguities and asymmetric redemption lifecycles:
1. Taxes (GST / Sales Tax) were calculated on the pre-discount gross subtotal before subtracting coupon discounts, resulting in customers paying full tax on discounted or free ticket allocations.
2. The background expiration service (`BookingLifecycleService.expireBooking`) unconditionally decremented `Coupon.usedCount` when unpaid reservation holds timed out, despite `usedCount` only being incremented upon payment confirmation (`status: CONFIRMED`), corrupting coupon usage limits.

## Problem Statement
Inconsistent pricing calculation and asymmetric redemption lifecycles create critical financial and operational risks:
1. **Tax Discrepancy & Overcharging**: Assessing tax on pre-discount amounts violates tax accounting standards and leads to customer billing discrepancies.
2. **Usage Limit Leaks**: Decrementing coupon usage on abandoned checkout carts leaks inventory, enabling infinite redemption beyond the configured `usageLimit`.
3. **Double Redemptions**: Concurrent payment confirmations could exceed remaining coupon slots without distributed locking or atomic database guards.

## Decision
Establish authoritative Server-Owned Single Source of Truth (SSOT) invariants for all coupon calculations and lifecycle state transitions:

1. **Pricing & Net Tax Invariant**:
   - The server (`BookingCreationService.createBooking`) calculates gross ticket subtotal, applies coupon discounts, and derives the **Net Taxable Subtotal**: $\text{netSubtotal} = \max(0, \text{subtotal} - \text{discount})$.
   - Ticket taxes are assessed strictly on the net taxable subtotal: $\text{netTicketTax} = \text{round}(\text{netSubtotal} \times \text{effectiveTaxRate})$.
   - Convenience fee and fee taxes are computed independently: $\text{convenienceFee} = \text{baseFee} \times \text{ticketCount}$, $\text{feeTax} = \text{round}(\text{convenienceFee} \times \text{effectiveTaxRate})$.
   - Total authoritative booking amount is: $\text{totalAmount} = \max(0, \text{netSubtotal} + \text{convenienceFee} + \text{netTicketTax} + \text{feeTax})$.

2. **Atomic Redemption Lifecycle Invariant**:
   - `createBooking`: Validates coupon rules (`validFrom`, `validUntil`, `usedCount < usageLimit`, `minOrderAmount`). **Zero mutations to `usedCount`**.
   - `confirmBooking`: Atomically increments `usedCount` inside the MongoDB session transaction using condition `$expr: { $lt: ['$usedCount', '$usageLimit'] }`.
   - `expireBooking`: **Zero mutations to `usedCount`**. Pending unconfirmed bookings never mutate `usedCount`.
   - `cancelBooking` / `refundBooking`: Decrements `usedCount` **only if** the booking was in `CONFIRMED` state (`previousStatus === BookingStatus.CONFIRMED || booking.confirmedAt`).

3. **Frontend Presentation Invariant**:
   - The frontend checkout components (`CheckoutPricing.tsx`) never calculate discounts or totals; they render the server-authoritative line items from the `Booking` document.

---

## Alternatives Considered

### Alternative A: Pre-Tax vs Post-Tax Discounting
- **Description**: Apply discount to the gross total including taxes and fees.
- **Pros**: Simple deduction on the final checkout line.
- **Cons**: Conflates ticket value with statutory taxes and merchant fees, causing tax remittance calculation inaccuracies.
- **Verdict**: Rejected in favor of Net Taxable Subtotal discounting.

### Alternative B: Reservation-Time Increment with Expiration Decrement
- **Description**: Increment `usedCount` when temporary reservation hold is created, and decrement when expired.
- **Pros**: Locks coupon immediately upon checkout initiation.
- **Cons**: High failure rate from dropped client sessions, lock contention, and drift if cleanup jobs fail.
- **Verdict**: Rejected in favor of Atomic Confirmation-Time Redemption.

---

## Consequences

- **Pros**:
  - Eliminates tax overcharges on discounted tickets.
  - Guarantees strict enforcement of coupon `usageLimit` without leaks.
  - Maintains strict alignment between frontend presentation and backend financial ledgers.
- **Cons**:
  - Requires database transaction sessions for confirmation redemptions.

---

## Technical & Operational Impact

### Migration Strategy
- Implemented in `apps/server/src/services/public/booking/booking-creation.service.ts` and `apps/server/src/services/public/booking/booking-lifecycle.service.ts`.
- Database schema `apps/server/src/models/coupon.schema.ts` and financial fields in `apps/server/src/models/booking.schema.ts` remain backward compatible.

### Operational Impact
- Automatic reservation cleanup workers no longer execute `Coupon.updateOne` operations, reducing database contention during background sweeps.

### Security Impact
- Atomic `$expr: { $lt: ['$usedCount', '$usageLimit'] }` conditional increments prevent race conditions during high-volume coupon drop campaigns.

### Performance Impact
- Zero additional database queries introduced during checkout creation.

### Testing Strategy
- Verified by unit regression suites in `apps/server/src/services/public/booking.service.test.ts` and `apps/server/src/services/admin/booking.service.test.ts`.

### Rollback Strategy
- Standard git rollback or blue/green deployment fallback on Render backend.

---

## Future Considerations
- Support for tiered / category-scoped multi-coupon campaigns will follow the same server-authoritative net tax calculation model.

## References
- [ARCHITECTURE.md (System Boundaries & SSOT Ownership Matrix)](../../ARCHITECTURE.md#L265-L281)
- [API_CONTRACTS.md (Booking & Coupon API Contracts)](../../API_CONTRACTS.md#L508-L544)
- [ADR-001 (Booking Ownership)](ADR-001-booking-ownership.md)
